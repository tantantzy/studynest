
(() => {
  "use strict";
  const cfg = window.STUDYNEST_CONFIG || {};
  const configured = Boolean(
    window.supabase &&
    cfg.supabaseUrl &&
    cfg.supabaseAnonKey &&
    !cfg.supabaseUrl.includes("YOUR_PROJECT") &&
    !cfg.supabaseAnonKey.includes("YOUR_PUBLIC")
  );

  window.studyNestConfigured = configured;
  window.studyNest = configured
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;
  window.studyNestSession = null;
  window.studyNestUser = null;
  window.studyNestProfile = null;

  async function profileFor(userId) {
    if (!window.studyNest || !userId) return null;
    const { data, error } = await window.studyNest
      .from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) console.error(error);
    return data || null;
  }

  async function refresh() {
    if (!configured) {
      document.dispatchEvent(new CustomEvent("studynest:auth-ready"));
      return;
    }
    const { data, error } = await window.studyNest.auth.getSession();
    if (error) console.error(error);
    window.studyNestSession = data?.session || null;
    window.studyNestUser = data?.session?.user || null;
    window.studyNestProfile = window.studyNestUser
      ? await profileFor(window.studyNestUser.id)
      : null;
    document.dispatchEvent(new CustomEvent("studynest:auth-ready", {
      detail: {
        session: window.studyNestSession,
        user: window.studyNestUser,
        profile: window.studyNestProfile
      }
    }));
  }

  window.requireStudyNestUser = async () => {
    if (!configured) return null;
    if (!window.studyNestUser) await refresh();
    if (!window.studyNestUser) {
      location.replace("login.html");
      return null;
    }
    return window.studyNestUser;
  };

  window.studyNestSignOut = async () => {
    if (window.studyNest) await window.studyNest.auth.signOut();
    location.replace("index.html");
  };

  window.studyNestRefreshAuth = refresh;
  if (window.studyNest) {
    window.studyNest.auth.onAuthStateChange(() => setTimeout(refresh, 0));
  }
  refresh();
})();
