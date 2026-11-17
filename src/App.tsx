import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BookOpen, Cat, ChevronRight, Cloud, GraduationCap, Heart, LockKeyhole, LogOut, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './services/supabase'
import type { UserProfile } from './types'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user) { setProfile(null); return }
    let alive = true
    supabase.from('profiles').select('id, display_name, role, created_at').eq('id', session.user.id).single()
      .then(({ data, error: profileError }) => {
        if (!alive) return
        if (profileError) setError('Đăng nhập thành công nhưng chưa tải được hồ sơ. Hãy kiểm tra migration Supabase.')
        else setProfile(data as UserProfile)
      })
    return () => { alive = false }
  }, [session])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setError('')
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (loginError) setError('Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.')
    setBusy(false)
  }

  async function handleLogout() {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
  }

  if (loading) return <main className="center-screen"><div className="loader" /><span>Đang chuẩn bị Neko…</span></main>

  if (!isSupabaseConfigured) return <SetupScreen />
  if (!session) return <LoginScreen email={email} password={password} setEmail={setEmail} setPassword={setPassword} error={error} busy={busy} onSubmit={handleLogin} />
  if (!profile) return <main className="center-screen"><div className="loader" /><span>Đang tải hồ sơ học tập…</span>{error && <p className="notice error">{error}</p>}</main>

  return <Dashboard profile={profile} email={session.user.email ?? ''} onLogout={handleLogout} />
}

function SetupScreen() {
  return <main className="setup-wrap"><section className="setup-card"><div className="mascot large"><Cat size={48} /></div><p className="eyebrow">NEKO JAPANESE · KHỞI TẠO</p><h1>Chào mừng bạn đến với Neko!</h1><p className="muted">Giao diện nền tảng đã sẵn sàng. Để bật đăng nhập thật, cần kết nối dự án Supabase của bạn.</p><div className="setup-steps"><div><span>1</span><p>Tạo dự án Supabase riêng.</p></div><div><span>2</span><p>Chạy file SQL trong thư mục <code>supabase/migrations</code>.</p></div><div><span>3</span><p>Sao chép URL và khóa public/anon vào file <code>.env</code>.</p></div></div><div className="notice info"><Cloud size={18} /> Chưa kết nối máy chủ. Không có tài khoản mẫu hoặc dữ liệu giả được tạo.</div></section></main>
}

type LoginProps = { email: string; password: string; setEmail: (v: string) => void; setPassword: (v: string) => void; error: string; busy: boolean; onSubmit: (e: FormEvent<HTMLFormElement>) => void }
function LoginScreen(props: LoginProps) {
  return <main className="login-wrap"><section className="login-card"><div className="brand-mark"><div className="mascot"><Cat size={38} strokeWidth={1.8} /></div><span className="sparkle"><Sparkles size={18}/></span></div><p className="eyebrow">YOUR LITTLE JAPANESE JOURNEY</p><h1>Neko Japanese</h1><p className="muted intro">Mỗi ngày một chút tiếng Nhật, tiến bộ từng ngày.</p><form onSubmit={props.onSubmit} className="login-form"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" placeholder="Nhập email tài khoản" value={props.email} onChange={e => props.setEmail(e.target.value)} required/><label htmlFor="password">Mật khẩu</label><input id="password" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu" value={props.password} onChange={e => props.setPassword(e.target.value)} required minLength={6}/>{props.error && <p className="notice error">{props.error}</p>}<button className="primary-btn" disabled={props.busy}>{props.busy ? 'Đang đăng nhập…' : 'Đăng nhập'} <ChevronRight size={18}/></button></form><div className="private-note"><LockKeyhole size={14}/> Ứng dụng riêng tư · Không mở đăng ký công khai</div></section></main>
}

function Dashboard({ profile, email, onLogout }: { profile: UserProfile; email: string; onLogout: () => void }) {
  return <main className="dashboard"><header className="topbar"><div className="brand-small"><div className="mascot mini"><Cat size={22}/></div><strong>Neko Japanese</strong></div><button className="icon-btn" onClick={onLogout} aria-label="Đăng xuất"><LogOut size={18}/></button></header><section className="welcome-card"><div><p className="eyebrow">KONNICHIWA!</p><h1>Xin chào{profile.display_name ? `, ${profile.display_name}` : ''}!</h1><p>Hôm nay mình học một chút nhé.</p></div><div className="mascot welcome-cat"><Cat size={58}/></div></section><section className="quick-stats"><div><span className="stat-icon pink"><Heart size={18}/></span><strong>0</strong><small>Ngày học liên tục</small></div><div><span className="stat-icon yellow"><Sparkles size={18}/></span><strong>0 XP</strong><small>Điểm kinh nghiệm</small></div><div><span className="stat-icon mint"><BookOpen size={18}/></span><strong>0</strong><small>Từ đã học</small></div></section><section className="section-heading"><div><p className="eyebrow">YOUR JOURNEY</p><h2>Lộ trình học tập</h2></div><span className="level-pill">Nhập môn → N3</span></section><div className="empty-learning"><div className="empty-icon"><GraduationCap size={30}/></div><h3>Hành trình sắp bắt đầu!</h3><p>Kho bài học sẽ xuất hiện tại đây sau khi Admin nhập dữ liệu và tạo lộ trình.</p></div><footer className="account-footer"><div><UserRound size={16}/><span>{email}</span><span className="role-pill">{profile.role === 'admin' ? 'ADMIN' : 'HỌC VIÊN'}</span></div><p><ShieldCheck size={14}/> Dữ liệu học tập được quản lý theo tài khoản.</p></footer></main>
}

export default App
