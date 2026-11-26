/* =====================================================================
   WHIZTY WEBSITE SETTINGS  –  the only file you need to edit.
   After editing, commit and push it to GitHub (see SETUP.md, "Updating the site").
   ===================================================================== */
window.WHIZTY_CONFIG = {

  /* ---- LAUNCH SWITCH ------------------------------------------------
     "waitlist"  = buttons open the Early Access form (use this now)
     "playstore" = buttons go straight to Google Play
     To launch: set CTA_MODE to "playstore" and paste your Play link.   */
  CTA_MODE: "waitlist",
  PLAY_STORE_URL: "",            // e.g. "https://play.google.com/store/apps/details?id=com.whizty.app"

  /* ---- WhatsApp "message us" button ---------------------------------
     Country code + number, digits only, e.g. "919876543210".
     Leave empty to hide the button (hidden for now, by the owner).      */
  WHATSAPP_NUMBER: "",

  /* ---- Early Access backend (Supabase Edge Function URL) ------------
     The spam checks (hidden trap field, minimum fill time, sign-up limits)
     run inside this function. No outside service and no keys are used here.   */
  API_URL: "https://ypdkqgizdweyfsnjqrsb.supabase.co/functions/v1/early-access",

  /* ---- Your main web address (used in referral links) -------------- */
  SITE_URL: "https://whizty.com",

  /* ---- Agent Neev scroll animation ----------------------------------
     Option A (in use) – one picture per page section, in page order.
       NEEV_ANCHORS = the section each picture belongs to.
     Option B – many frames cut from a video (see SETUP.md): empty
       NEEV_FRAMES and fill NEEV_SEQUENCE instead, e.g.
       NEEV_SEQUENCE: { pattern: "assets/neev/frame-{n}.webp", count: 120, pad: 3 }  */
  NEEV_FRAMES: [
    "assets/neev/neev-1.webp",   // waving hello      -> About
    "assets/neev/neev-2.webp",   // standing tall     -> Safety
    "assets/neev/neev-3.webp",   // pointing          -> Curriculum
    "assets/neev/neev-4.webp",   // smiling, waving   -> Reviews
    "assets/neev/neev-5.webp"    // thumbs up         -> Pricing
  ],
  NEEV_ANCHORS: ["about", "safety", "curriculum", "reviews", "pricing"],
  NEEV_SEQUENCE: { pattern: "", count: 0, pad: 3 },
  NEEV_BG: "#EFEDE2"              // background colour inside the Neev pictures
};
