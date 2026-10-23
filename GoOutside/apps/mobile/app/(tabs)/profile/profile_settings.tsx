
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { User } from "@supabase/supabase-js";

import Screen from "../../../src/components/Screen";
import AppButton from "../../../src/components/ui/AppButton";
import ProfileBanner from "../../../src/components/profile/ProfileBanner";
import SettingsCard from "../../../src/components/profile/SettingsCard";
import { supabase } from "../../../src/lib/supabase";

const ACCENTS = [
  "#0D9488",
  "#6366F1",
  "#3B82F6",
  "#EC4899",
  "#F59E0B",
];

type ProfileForm = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
};

const EMPTY_FORM: ProfileForm = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
};

function formFromUser(user: User, displayName: string): ProfileForm {
  return {
    fullName: displayName,
    email: user.email ?? "",
    phone: user.user_metadata?.phone ?? "",
    location: user.user_metadata?.location ?? "",
  };
}

export default function ProfileScreen() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [original, setOriginal] =
    useState<ProfileForm>(EMPTY_FORM);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [darkMode, setDarkMode] = useState(false);
  const [accentColor, setAccentColor] = useState("#0D9488");

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error) throw error;

        setUser(data.user);

        if (data.user) {
          const { data: profileData, error: profileError } =
            await supabase
              .from("Profile")
              .select("displayName")
              .eq("userID", data.user.id)
              .single();

          if (profileError) throw profileError;
          if (!mounted) return;

          const initial = formFromUser(
            data.user,
            profileData.displayName ?? ""
          );

          setForm(initial);
          setOriginal(initial);
        }
      } catch {
        if (mounted) {
          setUser(null);
          setError("Unable to load your account.");
        }
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_OUT") {
          setUser(null);
          setForm(EMPTY_FORM);
          setOriginal(EMPTY_FORM);
        } else if (session?.user) {
          setUser(session.user);

          if (event === "SIGNED_IN") {
            void (async () => {
              const { data: profileData, error } =
                await supabase
                  .from("Profile")
                  .select("displayName")
                  .eq("userID", session.user.id)
                  .single();

              if (!mounted || error) return;

              const initial = formFromUser(
                session.user,
                profileData.displayName ?? ""
              );

              setForm(initial);
              setOriginal(initial);
            })();
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function updateField(
    field: keyof ProfileForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleCancel() {
    setForm({ ...original });
    setError("");
    setSuccess("");
  }

  async function handleSave() {
    if (!user || saving) return;

    setError("");
    setSuccess("");

    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const location = form.location.trim();

    if (!fullName || !email) {
      setError("Display name and email are required.");
      return;
    }

    setSaving(true);

    try {
      // Save display name to public.Profile
      const { data: updatedProfile, error: profileError } =
        await supabase
          .from("Profile")
          .update({
            displayName: fullName,
          })
          .eq("userID", user.id)
          .select("displayName")
          .single();

      if (profileError) throw profileError;

      // Save other information to Supabase Auth
      const emailChanged = email !== user.email;

      const { data, error: authError } =
        await supabase.auth.updateUser({
          ...(emailChanged ? { email } : {}),
          data: {
            phone,
            location,
          },
        });

      if (authError) throw authError;

      if (data.user) setUser(data.user);

      const saved: ProfileForm = {
        fullName: updatedProfile.displayName,
        email: data.user?.email ?? user.email ?? "",
        phone,
        location,
      };

      setForm(saved);
      setOriginal(saved);

      setSuccess(
        emailChanged
          ? "Profile updated. Check your email to confirm the new address."
          : "Profile changes saved successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save changes."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    if (!user?.email) return;

    setError("");
    setSuccess("");

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(
        user.email
      );

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess(
      "Password reset email sent. Check your inbox."
    );
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      const { error: logoutError } =
        await supabase.auth.signOut();

      if (logoutError) throw logoutError;

      setUser(null);
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to log out."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  function confirmLogout() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => void handleLogout(),
        },
      ]
    );
  }

  if (checkingAuth) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color="#0D9488"
          />
          <Text style={styles.muted}>
            Loading account settings...
          </Text>
        </View>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.pageTitle}>
            Not logged in
          </Text>

          <Text style={styles.guestDescription}>
            Log in or create an account to manage your
            profile and account settings.
          </Text>

          <View style={styles.guestActions}>
            <AppButton
              title="Log In"
              onPress={() =>
                router.push("/Login_Sign_Up/login")
              }
            />

            <AppButton
              title="Create Account"
              variant="secondary"
              onPress={() =>
                router.push(
                  "/Login_Sign_Up/create_account"
                )
              }
            />
          </View>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}
        </View>
      </Screen>
    );
  }

  const displayName =
    form.fullName.trim() ||
    user.user_metadata?.username ||
    user.email?.split("@")[0] ||
    "User";

  const memberSince = new Date(
    user.created_at
  ).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Page heading */}
        <View style={styles.heading}>
          <Text style={styles.pageTitle}>
            Account Settings
          </Text>
          <Text style={styles.muted}>
            Manage your profile, account preferences,
            and subscription status
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.outlineButton]}
            onPress={handleCancel}
            disabled={saving}
          >
            <Text style={styles.outlineButtonText}>
              Cancel
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              { backgroundColor: accentColor },
              saving && styles.disabled,
            ]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </Pressable>
        </View>

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}

        {success ? (
          <Text style={styles.success}>{success}</Text>
        ) : null}

        {/* Profile banner */}
        <ProfileBanner
          name={displayName}
          memberSince={memberSince}
          location={form.location}
          accentColor={accentColor}
        />

        {/* Personal information */}
        <SettingsCard
          title="Personal Information"
          description="Update your default name, contact information, and public profile data"
        >
          <ProfileField
            label="Display Name *"
            value={form.fullName}
            placeholder="Your display name"
            onChangeText={(value) =>
              updateField("fullName", value)
            }
          />

          <ProfileField
            label="Email Address *"
            value={form.email}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(value) =>
              updateField("email", value)
            }
          />

          <ProfileField
            label="Phone Number"
            value={form.phone}
            placeholder="+1 (555) 000-0000"
            keyboardType="phone-pad"
            onChangeText={(value) =>
              updateField("phone", value)
            }
          />

          <ProfileField
            label="Location"
            value={form.location}
            placeholder="City, State"
            onChangeText={(value) =>
              updateField("location", value)
            }
          />
        </SettingsCard>

        {/* Subscription */}
        <SettingsCard title="Subscription Plan">
          <View style={styles.planBox}>
            <View style={styles.between}>
              <Text style={styles.strong}>
                Account Plan
              </Text>
              <Text style={styles.muted}>
                Not configured
              </Text>
            </View>

            <Text style={styles.smallText}>
              Subscription details will appear here
              when billing is integrated.
            </Text>
          </View>

          <View style={styles.subscriptionActions}>
            <ActionButton
              title="Upgrade Plan"
              disabled
              accentColor={accentColor}
            />
            <ActionButton
              title="Update Billing"
              disabled
              accentColor={accentColor}
              outline
            />
            <ActionButton
              title="Cancel Subscription"
              disabled
              accentColor={accentColor}
              outline
            />
          </View>
        </SettingsCard>

        {/* Theme */}
        <SettingsCard
          title="Theme & Personalization"
          description="Choose the interface theme that best represents your visual identity"
        >
          <View style={styles.settingRow}>
            <View style={styles.flex}>
              <Text style={styles.strong}>
                Automatic dark mode
              </Text>
              <Text style={styles.smallText}>
                Sync with your system preferences
              </Text>
            </View>

            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{
                false: "#CBD5E1",
                true: accentColor,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Text style={[styles.fieldLabel, styles.colorLabel]}>
            Active Accent Color
          </Text>

          <View style={styles.colors}>
            {ACCENTS.map((color) => (
              <Pressable
                key={color}
                accessibilityRole="radio"
                accessibilityLabel={`Accent ${color}`}
                accessibilityState={{
                  selected: accentColor === color,
                }}
                onPress={() => setAccentColor(color)}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color },
                  accentColor === color &&
                    styles.selectedColor,
                ]}
              >
                {accentColor === color ? (
                  <Text style={styles.colorCheck}>✓</Text>
                ) : null}
              </Pressable>
            ))}
          </View>

          <Text style={styles.preferenceNote}>
            Theme preferences currently affect this
            screen only and are not saved.
          </Text>
        </SettingsCard>

        {/* Security */}
        <SettingsCard
          title="Security & Active Sessions"
          description="Manage your password settings and monitor account access"
        >
          <View style={styles.settingRow}>
            <View style={styles.flex}>
              <Text style={styles.strong}>
                Current App Session
              </Text>
              <Text style={styles.smallText}>
                You are currently signed in
              </Text>
            </View>

            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>
                Current
              </Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.flex}>
              <Text style={styles.strong}>
                Password Settings
              </Text>
              <Text style={styles.smallText}>
                Manage your account password
              </Text>
            </View>

            <Pressable
              style={styles.smallOutlineButton}
              onPress={() => void handlePasswordReset()}
            >
              <Text style={styles.smallOutlineText}>
                Reset Password
              </Text>
            </Pressable>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.flex}>
              <Text style={styles.strong}>
                Sign Out
              </Text>
            </View>

            <Pressable
              style={styles.signOutButton}
              onPress={confirmLogout}
              disabled={loggingOut}
            >
              <Text style={styles.signOutText}>
                {loggingOut ? "Signing Out..." : "Sign Out"}
              </Text>
            </Pressable>
          </View>
        </SettingsCard>
      </ScrollView>
    </Screen>
  );
}

type ProfileFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences";
};

function ProfileField({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: ProfileFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

type ActionButtonProps = {
  title: string;
  accentColor: string;
  disabled?: boolean;
  outline?: boolean;
};

function ActionButton({
  title,
  accentColor,
  disabled = false,
  outline = false,
}: ActionButtonProps) {
  return (
    <View
      style={[
        styles.subscriptionButton,
        {
          backgroundColor: outline
            ? "#FFFFFF"
            : accentColor,
        },
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={{
          color: outline ? "#172033" : "#FFFFFF",
          fontSize: 13,
          fontWeight: "700",
        }}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#F5F7F2",
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  heading: {
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 5,
  },
  muted: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },
  guestDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: "#64748B",
    textAlign: "center",
    marginTop: 12,
  },
  guestActions: {
    width: "100%",
    gap: 12,
    marginTop: 26,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginBottom: 18,
  },
  actionButton: {
    borderRadius: 8,
    paddingHorizontal: 17,
    paddingVertical: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  outlineButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5EF",
  },
  outlineButtonText: {
    color: "#172033",
    fontWeight: "700",
    fontSize: 13,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  disabled: {
    opacity: 0.45,
  },
  error: {
    color: "#B42318",
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 13,
  },
  success: {
    color: "#166534",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 13,
  },
  field: {
    marginTop: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#465873",
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DCE5EF",
    borderRadius: 8,
    backgroundColor: "#FCFDFF",
    paddingHorizontal: 12,
    height: 43,
    fontSize: 14,
    color: "#172033",
  },
  planBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 14,
  },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  strong: {
    fontSize: 13,
    fontWeight: "700",
    color: "#172033",
  },
  smallText: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  subscriptionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  subscriptionButton: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  flex: {
    flex: 1,
  },
  colorLabel: {
    marginTop: 18,
  },
  colors: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  colorCircle: {
    width: 29,
    height: 29,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedColor: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  colorCheck: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  preferenceNote: {
    marginTop: 16,
    fontSize: 11,
    color: "#94A3B8",
  },
  currentBadge: {
    backgroundColor: "#D7F8F1",
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  currentBadgeText: {
    color: "#0D9488",
    fontSize: 11,
    fontWeight: "700",
  },
  smallOutlineButton: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#DCE5EF",
    borderRadius: 8,
  },
  smallOutlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#172033",
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  signOutText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
});
