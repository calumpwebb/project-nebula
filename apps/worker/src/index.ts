import { NativeConnection, Worker } from '@temporalio/worker'
import * as activities from './activities'

// 12-factor: Configuration via environment variables
const config = {
  temporalAddress: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  taskQueue: process.env.TASK_QUEUE || 'nebula-missions',
  namespace: process.env.TEMPORAL_NAMESPACE || 'default',
}

async function run() {
  console.log('Starting Temporal worker...')
  console.log(`  Temporal address: ${config.temporalAddress}`)
  console.log(`  Task queue: ${config.taskQueue}`)
  console.log(`  Namespace: ${config.namespace}`)

  const connection = await NativeConnection.connect({
    address: config.temporalAddress,
  })

  const worker = await Worker.create({
    connection,
    namespace: config.namespace,
    workflowsPath: new URL('./workflows/index.js', import.meta.url).pathname,
    activities,
    taskQueue: config.taskQueue,
  })

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down worker...')
    await worker.shutdown()
    await connection.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  console.log('Worker connected and listening for tasks')
  await worker.run()
}

run().catch((err) => {
  console.error('Worker failed:', err)
  process.exit(1)
})
