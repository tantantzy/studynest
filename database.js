
(() => {
  "use strict";

  const cfg = window.STUDYNEST_CONFIG || {};
  const configured =
    cfg.supabaseUrl &&
    cfg.supabaseAnonKey &&
    !cfg.supabaseUrl.includes("YOUR_PROJECT") &&
    !cfg.supabaseAnonKey.includes("YOUR_PUBLIC");

  window.studyNestConfigured = Boolean(configured);
  window.studyNest = configured && window.supabase
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;

  window.studyNestSession = null;
  window.studyNestUser = null;
  window.studyNestProfile = null;

  async function loadProfile(userId) {
    if (!window.studyNest || !userId) return null;
    const { data, error } = await window.studyNest
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("Profile load failed:", error);
      return null;
    }
    return data;
  }

  async function refreshAuth() {
    if (!window.studyNest) {
      document.dispatchEvent(new CustomEvent("studynest:auth-ready"));
      return;
    }

    const { data, error } = await window.studyNest.auth.getSession();
    if (error) console.error("Session load failed:", error);

    window.studyNestSession = data?.session || null;
    window.studyNestUser = data?.session?.user || null;
    window.studyNestProfile = window.studyNestUser
      ? await loadProfile(window.studyNestUser.id)
      : null;

    document.dispatchEvent(new CustomEvent("studynest:auth-ready", {
      detail: {
        session: window.studyNestSession,
        user: window.studyNestUser,
        profile: window.studyNestProfile
      }
    }));
  }

  window.requireStudyNestUser = async function requireStudyNestUser() {
    if (!window.studyNestConfigured) return null;
    if (!window.studyNestUser) {
      await refreshAuth();
    }
    if (!window.studyNestUser) {
      location.replace("login.html");
      return null;
    }
    return window.studyNestUser;
  };

  window.studyNestSignOut = async function studyNestSignOut() {
    if (window.studyNest) await window.studyNest.auth.signOut();
    localStorage.removeItem("studynest_user");
    location.replace("index.html");
  };

  if (window.studyNest) {
    window.studyNest.auth.onAuthStateChange(() => {
      setTimeout(refreshAuth, 0);
    });
  }

  refreshAuth();
})();
