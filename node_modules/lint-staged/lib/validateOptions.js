import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import { createDebug } from './debug.js'
import { invalidOption } from './messages.js'
import { InvalidOptionsError } from './symbols.js'

const debugLog = createDebug('lint-staged:validateOptions')

/** @type {(value: number) => boolean} */
const isValidIntegerValue = (value) => Number.isInteger(value) || value === Infinity

/**
 * Validate lint-staged options, either from the Node.js API or the command line flags.
 * @param {*} options
 * @param {boolean|string} [options.cwd] - Current working directory
 * @throws {InvalidOptionsError}
 */
export const validateOptions = async (options = {}, logger) => {
  debugLog('Validating options...')

  const { concurrent, cwd, maxArgLength } = options

  if (
    concurrent !== undefined &&
    typeof concurrent !== 'boolean' &&
    (!isValidIntegerValue(concurrent) || concurrent < 1)
  ) {
    logger.error(
      invalidOption('concurrent', `${concurrent}`, 'Must be boolean, positive integer or Infinite')
    )
    throw InvalidOptionsError
  }

  /** Ensure the passed cwd option exists; it might also be relative */
  if (typeof cwd === 'string') {
    try {
      const resolved = path.resolve(cwd)
      await fs.access(resolved, constants.F_OK)
    } catch (error) {
      debugLog('Failed to validate options: %o', options)
      logger.error(invalidOption('cwd', cwd, error.message))
      throw InvalidOptionsError
    }
  }

  if (
    maxArgLength !== undefined &&
    maxArgLength !== null &&
    (!isValidIntegerValue(maxArgLength) || maxArgLength < 1)
  ) {
    logger.error(
      invalidOption('maxArgLength', `${maxArgLength}`, 'Must be positive integer, or Infinite')
    )
    throw InvalidOptionsError
  }

  debugLog('Validated options: %o', options)
}
