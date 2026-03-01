import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export async function hapticImpact() {
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Haptics")) {
    await Haptics.impact({ style: ImpactStyle.Medium });
  }
}
