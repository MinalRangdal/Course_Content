import { useEffect, useState, useRef } from "react";
import { User, Mail, Shield, Award, Edit2, MapPin, Phone, Link, Globe, Users, Code, Camera } from "lucide-react";
import { getStudentProfile, updateProfile } from "../../services/api";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const { signIn } = useAuth();
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    getStudentProfile().then((data) => {
      setProfile(data);
      setForm(data);
    });
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await updateProfile(form);
      setProfile(updated);
      signIn(updated); // Update local context
      setIsEditing(false);
      addToast("Profile updated successfully ✅", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to update profile.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) return <div className="h-64 rounded-xl3 skeleton" />;

  const isBase64Avatar = profile.avatar?.startsWith("data:image");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Your Profile</h1>
        <p className="mt-1 text-ink/50">Manage your personal information and view stats.</p>
      </div>

      <div className="rounded-xl4 bg-surface p-8 shadow-card border border-border">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="relative group">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-canvas text-6xl shadow-inner border-4 border-surface overflow-hidden">
              {isBase64Avatar ? (
                <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                profile.avatar
              )}
            </div>
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-white shadow-pop hover:bg-primary-dark transition-colors"
            >
              <Edit2 size={16} />
            </button>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold">{profile.name}</h2>
            <p className="text-ink/60">{profile.bio || "Add a bio to tell people about yourself"}</p>
            
            <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
              <div className="flex items-center gap-2 rounded-xl bg-canvas px-4 py-2">
                <Award size={18} className="text-primary" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">Level</p>
                  <p className="font-bold">{profile.level}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-canvas px-4 py-2">
                <Shield size={18} className="text-gold-dark" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">Role</p>
                  <p className="font-bold capitalize">{profile.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8">
          <h3 className="font-bold mb-4">Personal Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-canvas p-4">
              <p className="text-xs font-bold text-ink/40 mb-1">Full Name</p>
              <p className="font-semibold flex items-center gap-2"><User size={14} className="text-ink/40"/> {profile.name}</p>
            </div>
            <div className="rounded-xl bg-canvas p-4">
              <p className="text-xs font-bold text-ink/40 mb-1">Email Address</p>
              <p className="font-semibold flex items-center gap-2"><Mail size={14} className="text-ink/40"/> {profile.email}</p>
            </div>
            {profile.contactNumber && (
              <div className="rounded-xl bg-canvas p-4">
                <p className="text-xs font-bold text-ink/40 mb-1">Contact Number</p>
                <p className="font-semibold flex items-center gap-2"><Phone size={14} className="text-ink/40"/> {profile.contactNumber}</p>
              </div>
            )}
            {profile.location && (
              <div className="rounded-xl bg-canvas p-4">
                <p className="text-xs font-bold text-ink/40 mb-1">Location</p>
                <p className="font-semibold flex items-center gap-2"><MapPin size={14} className="text-ink/40"/> {profile.location}</p>
              </div>
            )}
          </div>
        </div>

        {(profile.linkedin || profile.github || profile.facebook || profile.skills) && (
          <div className="mt-8 border-t border-border pt-8">
            <h3 className="font-bold mb-4">Professional Information & Social Links</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {profile.skills && (
                <div className="rounded-xl bg-canvas p-4 col-span-full">
                  <p className="text-xs font-bold text-ink/40 mb-1 flex items-center gap-2"><Code size={14}/> Skills</p>
                  <p className="font-semibold">{profile.skills}</p>
                </div>
              )}
              {profile.linkedin && (
                <div className="rounded-xl bg-canvas p-4 flex items-center gap-3">
                  <Link size={20} className="text-blue-600" />
                  <a href={profile.linkedin} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:underline line-clamp-1">{profile.linkedin}</a>
                </div>
              )}
              {profile.github && (
                <div className="rounded-xl bg-canvas p-4 flex items-center gap-3">
                  <Globe size={20} className="text-ink" />
                  <a href={profile.github} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:underline line-clamp-1">{profile.github}</a>
                </div>
              )}
              {profile.facebook && (
                <div className="rounded-xl bg-canvas p-4 flex items-center gap-3">
                  <Users size={20} className="text-blue-500" />
                  <a href={profile.facebook} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:underline line-clamp-1">{profile.facebook}</a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal open={isEditing} onClose={() => setIsEditing(false)} title="Edit Profile">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-canvas text-4xl shadow-inner border-2 border-border overflow-hidden">
                {form.avatar?.startsWith("data:image") ? (
                  <img src={form.avatar} alt="Avatar Preview" className="h-full w-full object-cover" />
                ) : (
                  form.avatar
                )}
              </div>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-white shadow-pop hover:bg-primary-dark transition-colors"
              >
                <Camera size={14} />
              </button>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
            </div>
            <p className="text-xs text-ink/50">Upload a profile picture</p>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-1 space-y-4 pb-4">
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-ink/60 uppercase tracking-wider">Basic Information</h4>
              <Input label="Full Name" value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} required />
              <Input label="Email Address" type="email" value={form.email || ""} onChange={e => setForm({...form, email: e.target.value})} required />
              <Input label="Contact Number" value={form.contactNumber || ""} onChange={e => setForm({...form, contactNumber: e.target.value})} />
              <Input label="Location" value={form.location || ""} onChange={e => setForm({...form, location: e.target.value})} />
            </div>
            
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="font-bold text-sm text-ink/60 uppercase tracking-wider">Professional Info</h4>
              <Input label="Bio / Headline" placeholder="e.g. AI enthusiast | Full Stack Developer" value={form.bio || ""} onChange={e => setForm({...form, bio: e.target.value})} />
              <Input label="Skills" placeholder="e.g. React, Node.js, Python" value={form.skills || ""} onChange={e => setForm({...form, skills: e.target.value})} />
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="font-bold text-sm text-ink/60 uppercase tracking-wider">Social Links</h4>
              <Input label="LinkedIn URL" value={form.linkedin || ""} onChange={e => setForm({...form, linkedin: e.target.value})} />
              <Input label="GitHub URL" value={form.github || ""} onChange={e => setForm({...form, github: e.target.value})} />
              <Input label="Facebook URL" value={form.facebook || ""} onChange={e => setForm({...form, facebook: e.target.value})} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
