const duaBank = [
  "Rabbi zidni 'ilman (O Lord, increase me in knowledge).",
  "Hasbunallahu wa ni'mal wakeel (Allah is sufficient for us).",
  "Rabbi-shrah li sadri (My Lord, expand for me my breast).",
  "Rabbana atina fid-dunya hasanatan (Lord, give us good in this world).",
  "Ya Muqallibal qulub, thabbit qalbi (O Turner of hearts, keep my heart firm).",
  "Subhanallahi wa bihamdihi (Glory be to Allah and Praise be to Him).",
  "Alhamdulillah for everything."
];

const dailyMessages = {
  0: { title: "Sunday Reflection 🤍", icon: "🌙" },
  1: { title: "Monday Motivation ✨", icon: "🚀" },
  2: { title: "Tuesday Grace 🌿", icon: "🍃" },
  3: { title: "Wednesday Love 🌸", icon: "💗" },
  4: { title: "Thursday Hope 🕯️", icon: "✨" },
  5: { title: "Friday Blessings 🤲", icon: "🕌" },
  6: { title: "Saturday Peace 🌙", icon: "⭐" }
};

// Added emojis directly into the strings for better compatibility
const prayerSpecificDuas = {
  Fajr: { text: "Allahumma bika asbahna wa bika amsayna (O Allah, by You we enter the morning).", icon: "🌅" },
  Dhuhr: { text: "Allahumma inni a'udhu bika minal-hammi wal-hazan (O Allah, I seek refuge from anxiety).", icon: "☀️" },
  Asr: { text: "Subhanallahi wa bihamdihi, Subhanallahil-Adheem (Glory and praise be to Allah).", icon: "🌤️" },
  Maghrib: { text: "Allahumma ajirni minan-nar (O Allah, protect me from the Fire).", icon: "🌇" },
  Isha: { text: "Bismika Allahumma amutu wa ahya (In Your name, O Allah, I die and I live).", icon: "🌙" }
};

const getActivePrayer = (hour) => {
  if (hour >= 4 && hour < 11) return "Fajr";
  if (hour >= 12 && hour < 15) return "Dhuhr";
  if (hour >= 15 && hour < 18) return "Asr";
  if (hour >= 18 && hour < 20) return "Maghrib";
  if (hour >= 20 || hour < 4) return "Isha";
  return null;
};

export const scheduleDailyDua = async () => {
  const isEnabled = localStorage.getItem("dua_reminder") === "true";
  if (!isEnabled || Notification.permission !== "granted") return;

  const registration = await navigator.serviceWorker.ready;
  const now = new Date();
  const currentDate = now.toDateString();
  const currentHour = now.getHours();

  // --- 1. DAILY REFLECTION ---
  const lastDailyShown = localStorage.getItem("last_dua_notif_time");
  const lastDailyDate = lastDailyShown ? new Date(parseInt(lastDailyShown)).toDateString() : null;

  if (lastDailyDate !== currentDate) {
    const dayIndex = now.getDay();
    const dayHeader = dailyMessages[dayIndex];
    const randomDua = duaBank[Math.floor(Math.random() * duaBank.length)];

    registration.active.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      title: String(dayHeader.title), // Explicitly cast to String
      body: String(randomDua),
      delay: 8000 
    });
    
    localStorage.setItem("last_dua_notif_time", now.getTime().toString());
  }

  // --- 2. PRAYER-SPECIFIC DUA ---
  const currentPrayer = getActivePrayer(currentHour);
  if (currentPrayer) {
    const prayerKey = `last_prayer_${currentPrayer.toLowerCase()}`;
    const lastPrayerDate = localStorage.getItem(prayerKey);

    if (lastPrayerDate !== currentDate) {
      const prayerData = prayerSpecificDuas[currentPrayer];
      
      registration.active.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        title: `${currentPrayer} Reminder ${prayerData.icon}`,
        body: String(prayerData.text),
        delay: 2000 
      });

      localStorage.setItem(prayerKey, currentDate);
    }
  }
};