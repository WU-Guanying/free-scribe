// import { pipeline } from '@xenova/transformers'
import { MessageTypes } from './presets'
import { pipeline, env } from "@xenova/transformers";

// Disable local models
env.allowLocalModels = false;
env.useBrowserCache = false;

class MyTranscriptionPipeline {
    static task = 'automatic-speech-recognition'
    static model = 'openai/whisper-tiny.en'
    static instance = null

    // 以异步方式创建或返回一个单例实例，并且支持通过 progress_callback 来报告任务进度。
    static async getInstance(progress_callback = null) {
        
        if (this.instance === null) {
            // this.instance = await pipeline(this.task)
            this.instance = await pipeline(this.task, null, { progress_callback })
            console.log('Pipeline instance created:', this.instance);  // 调试输出
        }
        // { progress_callback }：通过解构将 progress_callback 传递给 pipeline，这个对象可以让 pipeline 处理任务时实时报告进度。
        return this.instance
    }
}

// self 代表当前的 Worker 实例
// self.addEventListener('message', ...)（Worker 中）：
// 发送方：主线程。
// 接收方：Worker 线程。它监听主线程通过 postMessage() 发送的消息。

self.addEventListener('message', async (event) => {
    const { type, audio } = event.data
    if (type === MessageTypes.INFERENCE_REQUEST) {
        await transcribe(audio)
    }
})

async function transcribe(audio) {
    sendLoadingMessage('loading')


    let pipeline

    // 获取转录管道实例
    // Use a different model for sentiment-analysis
    // let pipe = await pipeline('automatic-speech-recognition', 'openai/whisper-tiny.en');
    
    try {
        pipeline = await MyTranscriptionPipeline.getInstance(load_model_callback)
        console.log(pipeline,'$$$')
    } catch (err) {
        console.log(err.message)
    }

    // if (typeof pipeline !== 'function') {
    //     console.error('Pipeline is not a function. Check the initialization of MyTranscriptionPipeline.');
    //     return;
    // }


    sendLoadingMessage('success')

    const stride_length_s = 5
    // GenerationTracker：用于处理生成的中间结果和最终结果。
    const generationTracker = new GenerationTracker(pipeline, stride_length_s)
    await pipeline(audio, {
        top_k: 0, //限制返回的候选项数量为 0，表示使用默认设置。
        do_sample: false,//不使用采样，确保输出是确定性的。
        chunk_length: 30,//每次处理音频的片段长度为 30 秒。
        stride_length_s,
        return_timestamps: true,
        callback_function: generationTracker.callbackFunction.bind(generationTracker),
        chunk_callback: generationTracker.chunkCallback.bind(generationTracker)
    })
    generationTracker.sendFinalResult()
}

async function load_model_callback(data) {
    const { status } = data
    if (status === 'progress') {
        const { file, progress, loaded, total } = data
        sendDownloadingMessage(file, progress, loaded, total)
    }
}

function sendLoadingMessage(status) {
    self.postMessage({
        type: MessageTypes.LOADING,
        status
    })
}

async function sendDownloadingMessage(file, progress, loaded, total) {
    self.postMessage({
        type: MessageTypes.DOWNLOADING,
        file,
        progress,
        loaded,
        total
    })
}

class GenerationTracker {
    constructor(pipeline, stride_length_s) {
        this.pipeline = pipeline
        this.stride_length_s = stride_length_s
        this.chunks = []
        this.time_precision = pipeline?.processor.feature_extractor.config.chunk_length / pipeline?.model.config.max_source_positions
        this.processed_chunks = [] //存储已经处理完的音频片段。每个片段将包含转录文本及其对应的时间戳（开始时间和结束时间）
        this.callbackFunctionCounter = 0 //用于控制 callbackFunction 的调用频率
    }

    sendFinalResult() {
        self.postMessage({ type: MessageTypes.INFERENCE_DONE })
    }

    // It only processes every 10th call (due to the counter check) to reduce the frequency of updates.
    // It decodes the output token IDs from the best beam and constructs a result object that includes the decoded text and the timestamp for when this best output occurred.
    // It sends a partial result message back to the main thread.
    callbackFunction(beams) {
        // 假设 beams 是 [{ output_token_ids: [101, 102] }, { output_token_ids: [103, 104] }]，代表不同的转录候选。
        this.callbackFunctionCounter += 1
        if (this.callbackFunctionCounter % 10 !== 0) {
            return
        }

        const bestBeam = beams[0]
        // 使用 pipeline.tokenizer.decode 方法，将最佳候选结果中的 output_token_ids 转换为可读的文本。
        let text = this.pipeline.tokenizer.decode(bestBeam.output_token_ids, {
            // skip_special_tokens: true：跳过特殊标记（如模型中的分隔符、标点符号等），只保留实际的转录文本。
            skip_special_tokens: true
        })

        const result = {
            text,
            start: this.getLastChunkTimestamp(),
            end: undefined
        }
        // 生成的部分转录结果发送到主线程。
        createPartialResultMessage(result)
    }


    // It collects chunks of audio, decodes them into text, and processes each chunk to create a detailed result that includes start and end timestamps.
    // It sends messages back to the main thread with all processed chunks of text as well as their associated timestamps.
    chunkCallback(data) {
        // 假设 data 是 { text: "Hello", timestamp: [0, 5] }
        this.chunks.push(data)
        // 使用 pipeline.tokenizer._decode_asr 方法对 this.chunks 进行解码，生成转录文本和对应的时间戳（start 和 end）。
        // { chunks } 是对对象的解构，表示从返回值数组中的第二个元素（这是一个对象）中，提取 chunks 属性。
        const [text, { chunks }] = this.pipeline.tokenizer._decode_asr(
            this.chunks,
            {
                time_precision: this.time_precision,
                return_timestamps: true,
                force_full_sequence: false
            }
        )

        this.processed_chunks = chunks.map((chunk, index) => {
            return this.processChunk(chunk, index)
        })
        // chunks [{text:text1,timestamp:[start1,end1]},{..}...]

        createResultMessage(
            this.processed_chunks, false, this.getLastChunkTimestamp()
        )
    }
    // 方法的主要作用是返回最后一个已处理音频片段的时间戳。在转录过程中，每个音频片段都会被处理并生成时间戳，而这个方法提供了获取这些时间戳的功能。
    getLastChunkTimestamp() {
        if (this.processed_chunks.length === 0) {
            return 0
        }
    }

    processChunk(chunk, index) {
        const { text, timestamp } = chunk
        const [start, end] = timestamp

        return {
            index,
            text: `${text.trim()}`,
            // 模板字符串（Template Literals）使用反引号 (`) 包裹，并可以嵌入表达式，通过 ${} 语法来执行这些表达式并将结果插入到字符串中。
            start: Math.round(start),
            end: Math.round(end) || Math.round(start + 0.9 * this.stride_length_s)
        }

    }
}

function createResultMessage(results, isDone, completedUntilTimestamp) {
    self.postMessage({
        type: MessageTypes.RESULT,
        results,
        isDone,
        completedUntilTimestamp
    })
}

function createPartialResultMessage(result) {
    self.postMessage({
        type: MessageTypes.RESULT_PARTIAL,
        result
    })
}


// self.addEventListener：

// 在 Worker 内部运行，用于监听主线程发送的 message 事件。
// 主线程通过 worker.postMessage() 发送消息后，Worker 内部的 self.addEventListener('message', ...) 就会捕获这个消息。
// worker.current.addEventListener('message', ...)：

// 在主线程中运行，用于监听 Worker 线程发送的 message 事件。
// Worker 线程通过 self.postMessage() 向主线程发送消息，主线程的 worker.current.addEventListener('message', ...) 捕获该消息。

// 主线程

// const worker = new Worker('worker.js');

// // 发送消息到 Worker 线程
// worker.postMessage({ type: 'TASK', payload: 'Hello Worker' });

// // 监听 Worker 返回的消息
// worker.addEventListener('message', (event) => {
//     console.log('主线程收到来自 Worker 的消息:', event.data);
// });

// Worker线程
// // 监听主线程发送的消息
// self.addEventListener('message', (event) => {
//     console.log('Worker 收到消息:', event.data);
    
//     // 处理后发送消息回主线程
//     self.postMessage({ message: 'Task completed' });
// });


// class Person {
//     constructor(name, age) {
//         this.name = name; // Initialize name
//         this.age = age;   // Initialize age
//     }

//     introduce() {
//         console.log(`Hi, I'm ${this.name} and I'm ${this.age} years old.`);
//     }
// }

// // Creating instances with different values
// const person1 = new Person('Alice', 30);
// const person2 = new Person('Bob', 25);

// person1.introduce(); // Logs: Hi, I'm Alice and I'm 30 years old.
// person2.introduce(); // Logs: Hi, I'm Bob and I'm 25 years old.