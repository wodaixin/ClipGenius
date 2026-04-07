/**
 * Provider capabilities definition
 */

export interface ProviderCapabilities {
  supportsText: boolean;
  supportsImage: boolean;
  supportsVideo: boolean;
}

export const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
  gemini: {
    supportsText: true,
    supportsImage: true,
    supportsVideo: true,
  },
  minimax: {
    supportsText: true,
    supportsImage: false, // Minimax text models (M2.7, M2.5, etc.) only support text input
    supportsVideo: false,
  },
};

export function getProviderCapabilities(provider: string): ProviderCapabilities {
  return PROVIDER_CAPABILITIES[provider] || {
    supportsText: true,
    supportsImage: false,
    supportsVideo: false,
  };
}

export function canProviderHandle(provider: string, contentType: string): boolean {
  const capabilities = getProviderCapabilities(provider);
  
  switch (contentType) {
    case "text":
    case "markdown":
    case "code":
    case "url":
      return capabilities.supportsText;
    case "image":
      return capabilities.supportsImage;
    case "video":
      return capabilities.supportsVideo;
    default:
      return false;
  }
}
