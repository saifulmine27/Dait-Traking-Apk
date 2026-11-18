ডায়েট ট্র্যাকার - সম্পূর্ণ প্যাকেজ
====================================
এই প্যাকেজে সবকিছু আছে: ওয়েব অ্যাপ, AI সার্ভার (Worker), Firebase নিয়ম, Android অ্যাপ বানানোর গাইড।

করার ক্রম
---------
ধাপ ১  Firebase     : 3-firebase/FIREBASE-SETUP.txt অনুযায়ী (একবার)
ধাপ ২  Cloudflare   : 2-cloudflare-worker/worker.js Worker-এ বসিয়ে Deploy
                       Settings > Variables and Secrets:
                         GEMINI_API_KEY      (Secret)
                         FIREBASE_PROJECT_ID (Text) = amar-dokhan-b738a
                         ALLOWED_ORIGIN      (Text) = https://saifulmine27.github.io
                       ঐচ্ছিক: GEMINI_MODEL=gemini-3.5-flash-lite (আরও দ্রুত/সস্তা), DAILY_LIMIT + KV (RL)
ধাপ ৩  GitHub       : 1-github-upload/ এর ভেতরের সবকিছু (icons ফোল্ডারসহ) Dait-Traking repository-তে আপলোড
                       ১-২ মিনিট পর সাইটে Ctrl+Shift+R
ধাপ ৪  Android      : ফোনের Chrome-এ সাইট খুলে "অ্যাপ ইনস্টল করুন"
                       নিজস্ব APK চাইলে 4-android-apk/APK-STEPS.txt

ফিচার তালিকা
------------
খাবার ট্র্যাক (১৫১টা বাংলাদেশি খাবার, বাংলা/Banglish সার্চ) | AI হিসাব (লিখে, কণ্ঠে, ছবি দিয়ে)
আগের দিনের খাবার যোগ | প্রোফাইল সেটআপ ও BMI | পানি ট্র্যাকার (ওজন অনুযায়ী লক্ষ্য)
ব্যায়াম ও স্টেপ | রিপোর্ট (৭/৩০/৯০ দিন, ইনসাইট, হিটম্যাপ) | পুষ্টি ট্যাব (ভিটামিন-খনিজ)
ওজনের ৭ দিনের গড় রেখা | Google সাইন ইন ও সব ডিভাইসে সিঙ্ক | লাইট/ডার্ক থিম
অনুপ্রেরণার কথা (১৩৮টা) | ইনস্টল করা অ্যাপ, অফলাইনে খোলা, ফোনের ব্যাক বাটন

নিরাপত্তা
---------
- Gemini/Claude API key কখনো index.html-এ বসাবেন না। শুধু Cloudflare Secret-এ।
- index.html-এর Firebase apiKey প্রকাশ্য থাকার জন্যই তৈরি; Google Cloud-এ ওয়েবসাইট সীমা বসান (FIREBASE-SETUP ধাপ ৫)।
- Worker শুধু সাইন ইন করা ব্যবহারকারী ও আপনার সাইট থেকে আসা অনুরোধ নেয়।

আপডেট দিলে
-----------
index.html বদলালে sw.js-এর  const V = "diet-v1";  সংখ্যা বাড়ান (diet-v2 ...), না হলে ফোনে পুরোনো কপি থাকতে পারে।

সীমাবদ্ধতা
-----------
- খাবারের ক্যালরি ও পুষ্টির মান আনুমানিক; চিকিৎসকের পরামর্শের বিকল্প নয়।
- Gemini ফ্রি টিয়ারের দৈনিক সীমা আছে (মডেল অনুযায়ী বদলায়), AI Studio-র Rate limits পাতায় দেখুন।
