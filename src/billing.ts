import Purchases from "react-native-purchases";

export async function restorePro(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return Boolean(info.entitlements.active.pro);
}
