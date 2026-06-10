import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, typography } from "../theme";

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Android + iOS</Text>
        </View>

        <Text style={styles.title}>Expert Mobile</Text>
        <Text style={styles.subtitle}>
          Cross-platform workspace is ready for the mobile app foundation.
        </Text>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Next build areas</Text>
          <Text style={styles.panelText}>Authentication</Text>
          <Text style={styles.panelText}>Expert profiles</Text>
          <Text style={styles.panelText}>Bookings and requests</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  badgeText: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  title: {
    marginTop: spacing.lg,
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: "800"
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 24
  },
  panel: {
    marginTop: spacing.xl,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg
  },
  panelTitle: {
    marginBottom: spacing.sm,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700"
  },
  panelText: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: typography.body
  }
});

