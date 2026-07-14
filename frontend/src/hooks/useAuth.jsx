import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("learnly_user");
      const parsed = stored ? JSON.parse(stored) : null;

      if (!parsed || !parsed.id || !parsed.email || !parsed.role) {
        localStorage.removeItem("learnly_user");
        return null;
      }

      return parsed;
    } catch {
      localStorage.removeItem("learnly_user");
      return null;
    }
  });

  const signIn = useCallback((nextUser) => {
    const safeUser = {
      id: nextUser.id,
      name: nextUser.name,
      email: nextUser.email,
      role: nextUser.role,
      avatar: nextUser.avatar,
      level: nextUser.level,
      xp: nextUser.xp,
      xpToNextLevel: nextUser.xpToNextLevel,
      streak: nextUser.streak,
      joinDate: nextUser.joinDate,
      badges: nextUser.badges,
      bio: nextUser.bio,
      linkedin: nextUser.linkedin,
      github: nextUser.github,
      facebook: nextUser.facebook,
      location: nextUser.location,
      skills: nextUser.skills,
      contactNumber: nextUser.contactNumber,
    };

    localStorage.setItem("learnly_user", JSON.stringify(safeUser));
    setUser(safeUser);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem("learnly_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
