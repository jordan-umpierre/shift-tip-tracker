import { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { migrate, saveShift, getSegments } from "./src/db";
import { summarize, toCsv, validateNoOverlap } from "./src/domain";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { exportEncryptedBackup, readBackup } from "./src/backup";
import { restorePro } from "./src/billing";
import * as DocumentPicker from "expo-document-picker";

export default function App() {
  const [role, setRole] = useState("Server");
  const [hours, setHours] = useState("4");
  const [wage, setWage] = useState("15");
  const [tips, setTips] = useState("20");
  const [segments, setSegments] = useState<ReturnType<typeof getSegments>>([]);
  useEffect(() => { migrate(); setSegments(getSegments()); }, []);
  const summary = summarize(segments);
  const add = () => {
    const start = new Date(Date.now() - Number(hours) * 3600000).toISOString();
    const end = new Date().toISOString();
    const segment = { role, startedAt: start, endedAt: end, wageMinor: Math.round(Number(wage) * 100), tips: { cashMinor: Math.round(Number(tips) * 100), cardMinor: 0 } };
    try { validateNoOverlap([...segments, segment]); saveShift(`shift-${Date.now()}`, segment); setSegments(getSegments()); }
    catch (error) { Alert.alert("Check this shift", error instanceof Error ? error.message : "Invalid shift"); }
  };
  const exportCsv = async () => { const file = new File(Paths.cache, "shift-tip-tracker.csv"); file.write(toCsv(segments)); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri); };
  const backup = async () => { await exportEncryptedBackup({ segments }); Alert.alert("Device-key backup ready", "This encrypted backup restores only on this app installation."); };
  const restoreBackup = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: "application/octet-stream", copyToCacheDirectory: true });
    if (picked.canceled) return;
    try {
      const restored = await readBackup(picked.assets[0].uri);
      restored.forEach(segment => saveShift(`restored-${segment.startedAt}`, segment));
      setSegments(getSegments()); Alert.alert("Backup restored", `${restored.length} segments restored.`);
    } catch (error) { Alert.alert("Restore failed", error instanceof Error ? error.message : "The backup could not be restored."); }
  };
  const restore = async () => { try { Alert.alert("Pro restored", (await restorePro()) ? "Pro features are available." : "No Pro purchase found."); } catch { Alert.alert("Restore unavailable", "Connect a development build to the store sandbox."); } };
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.eyebrow}>SHIFT / TIP TRACKER</Text><Text accessibilityRole="header" aria-level={1} style={styles.title}>Log the work. Keep the data.</Text>
    <Text style={styles.muted}>Offline, account-free tracking for tipped shifts.</Text>
    <View style={styles.card}><Text accessibilityRole="header" aria-level={2} style={styles.heading}>New shift segment</Text>
      <TextInput accessibilityLabel="Role" style={styles.input} value={role} onChangeText={setRole} placeholder="Role" placeholderTextColor="#8d8a83" />
      <TextInput accessibilityLabel="Hours worked" style={styles.input} value={hours} onChangeText={setHours} keyboardType="decimal-pad" placeholder="Hours" placeholderTextColor="#8d8a83" />
      <TextInput accessibilityLabel="Hourly wage in dollars" style={styles.input} value={wage} onChangeText={setWage} keyboardType="decimal-pad" placeholder="Hourly wage" placeholderTextColor="#8d8a83" />
      <TextInput accessibilityLabel="Tips in dollars" style={styles.input} value={tips} onChangeText={setTips} keyboardType="decimal-pad" placeholder="Cash and card tips" placeholderTextColor="#8d8a83" />
      <Pressable accessibilityRole="button" accessibilityLabel="Save shift segment" style={styles.button} onPress={add}><Text style={styles.buttonText}>Save segment</Text></Pressable>
    </View>
    <View style={styles.card}><Text accessibilityRole="header" aria-level={2} style={styles.heading}>Recent summary</Text><Text style={styles.metric}>${(summary.grossMinor / 100).toFixed(2)}</Text><Text style={styles.muted}>{Math.round(summary.minutes / 60 * 10) / 10} hours · ${(summary.effectiveHourlyMinor / 100).toFixed(2)}/hr effective</Text><Text style={styles.note}>Estimates use your entries and are not tax advice.</Text><Pressable accessibilityRole="button" style={styles.secondary} onPress={exportCsv}><Text style={styles.secondaryText}>Export CSV</Text></Pressable><Pressable accessibilityRole="button" style={styles.secondary} onPress={backup}><Text style={styles.secondaryText}>Create device-key backup</Text></Pressable><Pressable accessibilityRole="button" style={styles.secondary} onPress={restoreBackup}><Text style={styles.secondaryText}>Restore on this installation</Text></Pressable><Pressable accessibilityRole="button" style={styles.secondary} onPress={restore}><Text style={styles.secondaryText}>Restore Pro purchase</Text></Pressable></View>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#171817" }, page: { padding: 24, gap: 16 }, eyebrow: { color: "#e7a06b", letterSpacing: 2, fontSize: 12, fontWeight: "700" }, title: { color: "#fff8e9", fontSize: 32, fontWeight: "800" }, muted: { color: "#c2bdb1", fontSize: 16, lineHeight: 24 }, card: { backgroundColor: "#242622", borderRadius: 20, padding: 20, gap: 12 }, heading: { color: "#fff8e9", fontSize: 20, fontWeight: "700" }, input: { minHeight: 52, borderColor: "#69675f", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, color: "#fff8e9", fontSize: 17 }, button: { minHeight: 52, borderRadius: 10, backgroundColor: "#e7a06b", justifyContent: "center", alignItems: "center" }, buttonText: { color: "#171817", fontSize: 17, fontWeight: "800" }, metric: { color: "#e7a06b", fontSize: 40, fontWeight: "800" }, note: { color: "#c2bdb1", fontSize: 13 }, secondary: { minHeight: 48, borderRadius: 10, borderColor: "#e7a06b", borderWidth: 1, justifyContent: "center", alignItems: "center" }, secondaryText: { color: "#e7a06b", fontWeight: "700", fontSize: 16 } });
