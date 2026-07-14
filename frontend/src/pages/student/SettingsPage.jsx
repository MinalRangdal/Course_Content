import { useState } from "react";
import { Settings, Bell, Lock, User, MonitorSmartphone } from "lucide-react";
import Button from "../../components/Button";
import { useTheme } from "../../hooks/useTheme";
import { useToast } from "../../components/Toast";

function Toggle({ checked, onChange }) {
  return (
    <div 
      className={`toggle-switch ${checked ? 'active' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    />
  );
}

export default function SettingsPage() {
  const { darkMode, setDarkMode } = useTheme();
  const { addToast } = useToast();

  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem("learnly_notifications");
      return stored ? JSON.parse(stored) : {
        emailNotifs: true,
        pushNotifs: false,
        publicProfile: true,
      };
    } catch {
      return { emailNotifs: true, pushNotifs: false, publicProfile: true };
    }
  });

  const toggle = (key) => {
    const nextState = !settings[key];
    const newSettings = { ...settings, [key]: nextState };
    setSettings(newSettings);
    localStorage.setItem("learnly_notifications", JSON.stringify(newSettings));
    
    if (key === 'emailNotifs' || key === 'pushNotifs') {
      addToast(`Notifications ${nextState ? 'enabled successfully 🔔' : 'disabled'}`, 'success');
    } else if (key === 'publicProfile') {
      addToast(`Public profile ${nextState ? 'enabled' : 'disabled'}`, 'success');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-ink/50">Manage your account preferences.</p>
      </div>

      <div className="space-y-6">
        
        {/* Profile Section */}
        <section className="rounded-xl3 bg-surface shadow-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border bg-canvas/30 px-6 py-4">
            <User size={18} className="text-ink/60" />
            <h2 className="font-bold">Profile Visibility</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Public Profile</p>
                <p className="text-sm text-ink/50">Allow other students to find you and see your level.</p>
              </div>
              <Toggle checked={settings.publicProfile} onChange={() => toggle("publicProfile")} />
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="rounded-xl3 bg-surface shadow-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border bg-canvas/30 px-6 py-4">
            <Bell size={18} className="text-ink/60" />
            <h2 className="font-bold">Notifications</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Email Notifications</p>
                <p className="text-sm text-ink/50">Receive course updates and daily streak reminders.</p>
              </div>
              <Toggle checked={settings.emailNotifs} onChange={() => toggle("emailNotifs")} />
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Push Notifications</p>
                <p className="text-sm text-ink/50">Get alerts directly in your browser.</p>
              </div>
              <Toggle checked={settings.pushNotifs} onChange={() => toggle("pushNotifs")} />
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="rounded-xl3 bg-surface shadow-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border bg-canvas/30 px-6 py-4">
            <MonitorSmartphone size={18} className="text-ink/60" />
            <h2 className="font-bold">Appearance</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Dark Mode</p>
                <p className="text-sm text-ink/50">Switch to a darker theme for night time learning.</p>
              </div>
              <Toggle checked={darkMode} onChange={setDarkMode} />
            </div>
          </div>
        </section>

      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={() => alert("Settings saved (demo)")}>Save Preferences</Button>
      </div>
    </div>
  );
}
