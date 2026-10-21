/**
 * Handle logging of task `ctx.output` to the specified `logger`
 * @param {Object} ctx - The context
 * @param {Object} logger - The logger
 */
export const printTaskOutput = (ctx = {}, logger) => {
  if (!Array.isArray(ctx.output)) return
  const log = ctx.errors?.size > 0 ? logger.error : logger.log
  for (const line of ctx.output) {
    log(line)
  }
}
