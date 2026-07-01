import { useLocation } from 'wouter'
import BottomNav from '../components/BottomNav'

export default function TermsPage() {
  const [, navigate] = useLocation()

  return (
    <div style={{ minHeight: '100vh', background: '#08071a', color: '#fff', fontFamily: 'Poppins, sans-serif', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, #100f28 0%, #08071a 100%)', padding: '16px 20px', borderBottom: '1px solid rgba(155,32,216,0.2)', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={() => navigate(-1 as any)} style={{ background: 'rgba(155,32,216,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>শর্ত ও নিয়মাবলী</h1>
          <p style={{ margin: 0, color: '#8888aa', fontSize: '11px' }}>Terms & Conditions — Lotto Win</p>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        {/* Last updated */}
        <div style={{ background: 'rgba(155,32,216,0.1)', border: '1px solid rgba(155,32,216,0.2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
          <p style={{ color: '#9b20d8', fontSize: '12px', fontWeight: 600, margin: 0 }}>📅 সর্বশেষ আপডেট: জুলাই ২০২৫</p>
        </div>

        {sections.map((s, i) => (
          <div key={i} style={{ marginBottom: '24px' }}>
            <h2 style={{ color: '#f0a500', fontSize: '15px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{s.icon}</span> {s.title}
            </h2>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(155,32,216,0.12)', borderRadius: '12px', padding: '14px 16px' }}>
              {s.points.map((p, j) => (
                <div key={j} style={{ display: 'flex', gap: '10px', marginBottom: j < s.points.length - 1 ? '10px' : 0 }}>
                  <span style={{ color: '#9b20d8', fontWeight: 700, flexShrink: 0, fontSize: '13px' }}>•</span>
                  <p style={{ color: '#ccccdd', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{p}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{ background: 'linear-gradient(135deg, rgba(155,32,216,0.12) 0%, rgba(232,24,122,0.08) 100%)', border: '1px solid rgba(155,32,216,0.25)', borderRadius: '16px', padding: '20px', textAlign: 'center', marginTop: '10px' }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>🎰 Lotto Win — আপনার ভরসার জায়গা</p>
          <p style={{ color: '#8888aa', fontSize: '12px', lineHeight: '1.6', marginBottom: '14px' }}>
            যেকোনো প্রশ্ন বা অভিযোগের জন্য আমাদের WhatsApp-এ যোগাযোগ করুন। আমরা সর্বদা আপনার পাশে আছি।
          </p>
          <button onClick={() => navigate('/')} style={{ padding: '12px 28px', borderRadius: '50px', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #f0a500, #e8187a, #9b20d8)', color: '#fff', fontWeight: 700, fontSize: '14px' }}>
            হোমে ফিরে যাও
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

const sections = [
  {
    icon: '📋',
    title: '১. সাধারণ শর্তাবলী',
    points: [
      'Lotto Win একটি বৈধ অনলাইন লটারি প্ল্যাটফর্ম যা বাংলাদেশের ব্যবহারকারীদের জন্য পরিচালিত হয়।',
      'প্ল্যাটফর্ম ব্যবহার করলে আপনি স্বয়ংক্রিয়ভাবে এই শর্তাবলীতে সম্মত হচ্ছেন।',
      'আমরা যেকোনো সময় শর্তাবলী পরিবর্তন করার অধিকার রাখি। পরিবর্তনের বিষয়ে ব্যবহারকারীদের আগে থেকে জানানো হবে।',
      'এই শর্তাবলী লঙ্ঘন করলে অ্যাকাউন্ট বাতিল করা হতে পারে।',
    ],
  },
  {
    icon: '👤',
    title: '২. নিবন্ধন ও অ্যাকাউন্ট',
    points: [
      'প্ল্যাটফর্ম ব্যবহার করতে আপনার বয়স কমপক্ষে ১৮ বছর হতে হবে।',
      'প্রতিটি ব্যক্তি শুধুমাত্র একটি অ্যাকাউন্ট খুলতে পারবেন। একাধিক অ্যাকাউন্ট তৈরি করলে সকল অ্যাকাউন্ট বাতিল করা হবে।',
      'নিবন্ধনের সময় সঠিক তথ্য দেওয়া বাধ্যতামূলক। ভুল তথ্য দিলে পুরস্কার বাতিল হতে পারে।',
      'আপনার পাসওয়ার্ড ও অ্যাকাউন্টের নিরাপত্তা আপনার দায়িত্ব।',
    ],
  },
  {
    icon: '🎟️',
    title: '৩. টিকিট কেনা',
    points: [
      'প্রতিটি ড্র-এর জন্য নির্ধারিত সময়ের মধ্যে টিকিট কিনতে হবে। নির্দিষ্ট সময়ের পরে টিকিট কেনা যাবে না।',
      'টিকিট কেনার পরে কোনো ফেরত বা বাতিলের সুবিধা নেই।',
      'এক ড্র-এ একজন ব্যবহারকারী সর্বোচ্চ নির্ধারিত সংখ্যক টিকিট কিনতে পারবেন।',
      'টিকিটের দাম বাংলাদেশী টাকায় (BDT) পরিশোধ করতে হবে bKash, Nagad বা Rocket-এর মাধ্যমে।',
    ],
  },
  {
    icon: '💳',
    title: '৪. পেমেন্ট ও ডিপোজিট',
    points: [
      'ডিপোজিট রিকোয়েস্ট যাচাই করার পর অ্যাকাউন্টে যোগ করা হবে। সাধারণত ১-৩ ঘণ্টার মধ্যে প্রক্রিয়া সম্পন্ন হয়।',
      'ভুল Transaction ID বা ভুল পরিমাণ দিলে ডিপোজিট বাতিল হবে।',
      'একই Transaction ID একাধিকবার ব্যবহার করা যাবে না — এটি জালিয়াতি হিসেবে গণ্য হবে।',
      'সন্দেহজনক পেমেন্ট কার্যক্রমের ক্ষেত্রে অ্যাকাউন্ট স্থগিত করা হতে পারে।',
    ],
  },
  {
    icon: '🏆',
    title: '৫. পুরস্কার ও ড্র',
    points: [
      'ড্র নিরপেক্ষভাবে এবং র‍্যান্ডম পদ্ধতিতে পরিচালনা করা হয়।',
      'বিজয়ীর নাম ও টিকিট রেফারেন্স নম্বর প্রকাশ করা হবে।',
      'পুরস্কারের অর্থ বিজয়ীর Lotto Win অ্যাকাউন্ট ব্যালেন্সে যোগ করা হবে।',
      'পুরস্কার উত্তোলনের জন্য পরিচয় যাচাই প্রয়োজন হতে পারে।',
      'যেকোনো প্রতারণা বা অনিয়মের ক্ষেত্রে পুরস্কার বাতিল করার অধিকার আমাদের আছে।',
    ],
  },
  {
    icon: '🔒',
    title: '৬. গোপনীয়তা ও তথ্য সুরক্ষা',
    points: [
      'আপনার ব্যক্তিগত তথ্য তৃতীয় পক্ষের সাথে শেয়ার করা হবে না।',
      'আমরা আপনার ফোন নম্বর এবং ইমেইল পরিষেবা উন্নয়নের জন্য ব্যবহার করতে পারি।',
      'আপনার অ্যাকাউন্টের সকল তথ্য নিরাপদে সংরক্ষণ করা হয়।',
    ],
  },
  {
    icon: '⚠️',
    title: '৭. দায়বদ্ধতা ও ঝুঁকি',
    points: [
      'লটারিতে অংশগ্রহণ সম্পূর্ণ আপনার নিজের ইচ্ছায় এবং ঝুঁকিতে।',
      'টিকিট কেনার আগে নিজের আর্থিক সামর্থ্য বিবেচনা করুন।',
      'প্রযুক্তিগত সমস্যার কারণে কোনো ড্র বিলম্বিত বা বাতিল হলে Lotto Win দায়বদ্ধ থাকবে না।',
      'ইন্টারনেট সংযোগ বা ডিভাইসের সমস্যার জন্য আমরা দায়ী নই।',
    ],
  },
  {
    icon: '📞',
    title: '৮. যোগাযোগ ও অভিযোগ',
    points: [
      'যেকোনো অভিযোগ বা প্রশ্নের জন্য আমাদের WhatsApp-এ যোগাযোগ করুন।',
      'অভিযোগ প্রাপ্তির পর ৪৮ ঘণ্টার মধ্যে সাড়া দেওয়ার চেষ্টা করা হবে।',
      'প্রতারণা বা অনিয়মের অভিযোগ যথাযথ কর্তৃপক্ষের কাছে রিপোর্ট করা হবে।',
    ],
  },
]
