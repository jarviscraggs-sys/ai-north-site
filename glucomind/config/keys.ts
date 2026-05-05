/**
 * API keys — loaded from EAS environment or fallback.
 * In EAS builds, set OPENAI_API_KEY as an EAS Secret.
 * Locally, keys are read from .env (gitignored).
 */
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const OPENAI_API_KEY: string =
  extra.openaiApiKey ??
  process.env.EXPO_PUBLIC_OPENAI_API_KEY ??
  '';
