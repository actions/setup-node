// Jest setup file to ensure globals are available in ESM mode
import { jest } from '@jest/globals';

// Make jest available globally
globalThis.jest = jest;