// Extension settings types (matching mobile app structure)

export interface SubtitleSettings {
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  bottomOffset: number;
}

export interface OverlaySettings {
  bgOpacity: number;
  textShadow: boolean;
}

export interface ExtensionSettings {
  subtitle: SubtitleSettings;
  overlay: OverlaySettings;
}

// Default settings
export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  subtitle: {
    fontSize: 15,
    fontWeight: "bold",
    fontStyle: "normal",
    bottomOffset: 60,
  },
  overlay: {
    bgOpacity: 70,
    textShadow: true,
  },
};
