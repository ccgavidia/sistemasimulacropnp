import React, { useState } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { 
  Home, 
  BookOpen, 
  Database, 
  Clock, 
  CheckSquare, 
  Gamepad2, 
  Calendar, 
  Headphones, 
  LogOut, 
  Settings, 
  ShieldAlert, 
  Menu, 
  X, 
  User as UserIcon, 
  MessageCircle, 
  Send, 
  Video, 
  Facebook, 
  Share2 
} from "lucide-react";
import { RolUsuario, Usuario } from "../types";

interface LayoutProps {
  user: Usuario;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onToggleRole?: () => void;
  children: React.ReactNode;
}

export default function Layout({ user, activeTab, setActiveTab, onLogout, onToggleRole, children }: LayoutProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [socialModal, setSocialModal] = useState<{ isOpen: boolean; name: string; url: string } | null>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  // Structured menu items matching the requested screenshot breakdown
  const personalMenuItems = [
    { id: "inicio", label: "Inicio", icon: Home, roles: [RolUsuario.USUARIO, RolUsuario.ADMINISTRADOR] },
    { id: "temario", label: "Temario", icon: BookOpen, roles: [RolUsuario.USUARIO, RolUsuario.ADMINISTRADOR] },
    { id: "banco_preguntas", label: "Banco de preguntas", icon: Database, roles: [RolUsuario.USUARIO, RolUsuario.ADMINISTRADOR] },
    { id: "simulador_examen", label: "Simulador de examen", icon: Clock, roles: [RolUsuario.USUARIO, RolUsuario.ADMINISTRADOR] },
    { id: "practicar_materias", label: "Prácticar por materias", icon: CheckSquare, roles: [RolUsuario.USUARIO, RolUsuario.ADMINISTRADOR] },
    { id: "zona_juego", label: "Zona de juego", icon: Gamepad2, roles: [RolUsuario.USUARIO, RolUsuario.ADMINISTRADOR], isNew: true },
    { id: "audios", label: "Audios", icon: Headphones, roles: [RolUsuario.USUARIO, RolUsuario.ADMINISTRADOR] },
  ];

  const adminMenuItems = [
    { id: "admin_questions", label: "Gestión de Preguntas", icon: Settings, roles: [RolUsuario.ADMINISTRADOR] },
    { id: "admin_reports", label: "Métricas y Reportes", icon: ShieldAlert, roles: [RolUsuario.ADMINISTRADOR] },
  ];

  const communityItems = [
    { name: "TikTok", icon: Video, url: "https://www.tiktok.com/@siecopol" },
    { name: "WhatsApp", icon: MessageCircle, url: "https://chat.whatsapp.com/siecopol" },
    { name: "Telegram", icon: Send, url: "https://t.me/siecopol" },
    { name: "Facebook", icon: Facebook, url: "https://facebook.com/siecopol" }
  ];

  const allowedPersonal = personalMenuItems.filter((item) => item.roles.includes(user.rol));
  const allowedAdmin = adminMenuItems.filter((item) => item.roles.includes(user.rol));

  const handleCommunityClick = (name: string, url: string) => {
    setSocialModal({ isOpen: true, name, url });
  };

  const getS2Name = () => {
    if (user.grado) {
      const apellidosPart = user.apellidos ? ` ${user.apellidos.toUpperCase()}` : "";
      return `${user.grado} PNP ${user.nombre.toUpperCase()}${apellidosPart}`;
    }
    const uppercaseName = user.nombre.toUpperCase();
    if (uppercaseName.startsWith("S2") || uppercaseName.startsWith("S1") || uppercaseName.startsWith("SO")) {
      return uppercaseName;
    }
    return `S2 PNP ${uppercaseName}`;
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden" id="layout_wrapper">
      
      {/* Desktop Navigation Sidebar (Light Theme, Dark Green Details) */}
      <nav className="hidden md:flex w-64 bg-white flex-col border-r border-slate-200 shrink-0 text-slate-700 shadow-sm" id="desktop_sidebar">
        {/* Header - Welcome user exact layout */}
        <div className="p-5 border-b border-slate-150 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#063c25] text-white flex items-center justify-center font-black text-sm border-2 border-emerald-100 shadow-inner">
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">BIENVENIDO:</p>
              <p className="text-xs font-black text-slate-800 truncate mt-0.5" title={getS2Name()}>{getS2Name()}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">{user.rol}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* Section: PERSONAL */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Personal</p>
            {allowedPersonal.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-extrabold tracking-tight transition-all text-left cursor-pointer focus:outline-none ${
                    isActive
                      ? "bg-emerald-50 text-[#063c25] font-black border-l-4 border-[#063c25]"
                      : "text-slate-600 hover:text-emerald-950 hover:bg-slate-50"
                  }`}
                  id={`sidebar_btn_${item.id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-[#063c25]" : "text-slate-400"}`} />
                    <span className="truncate uppercase">{item.label}</span>
                  </div>
                  {item.isNew && (
                    <span className="text-[8px] font-black bg-emerald-700 text-white px-1.5 py-0.5 rounded uppercase shrink-0">
                      NUEVO
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section: ADMINISTRACIÓN (If applicable) */}
          {allowedAdmin.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Administración</p>
              {allowedAdmin.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold tracking-tight transition-all text-left cursor-pointer focus:outline-none ${
                      isActive
                        ? "bg-emerald-50 text-[#063c25] font-black border-l-4 border-[#063c25]"
                        : "text-slate-600 hover:text-[#063c25] hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-[#063c25]" : "text-slate-400"}`} />
                    <span className="uppercase truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Section: COMUNIDAD */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Comunidad</p>
            {communityItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => handleCommunityClick(item.name, item.url)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-emerald-950 hover:bg-slate-50 transition-colors text-left cursor-pointer focus:outline-none"
                >
                  <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="uppercase">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer/Logout button in Desktop Sidebar */}
        <div className="p-4 border-t border-slate-150 bg-slate-50/50">
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 transition-colors text-left focus:outline-none"
              id="sidebar_profile_btn"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {user.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate leading-none">{user.nombre}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{user.email}</p>
                  <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded uppercase mt-1 ${
                    user.rol === RolUsuario.ADMINISTRADOR 
                      ? "bg-rose-50 text-rose-700 border border-rose-100" 
                      : user.accesoCompleto 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                  }`}>
                    {user.rol === RolUsuario.ADMINISTRADOR 
                      ? "ADMINISTRADOR 👑" 
                      : user.accesoCompleto 
                        ? "ACCESO COMPLETO 🟢" 
                        : "DEMO LIMITADO 🟡"}
                  </span>
                </div>
              </div>
              <Menu className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            </button>

            {profileOpen && (
              <div className="absolute bottom-12 left-0 right-0 mb-2 rounded-xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-fade-in">
                {onToggleRole && (
                  <button
                    onClick={() => {
                      onToggleRole();
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-emerald-800 hover:bg-emerald-50 font-black border-b border-slate-100 transition-colors focus:outline-none"
                    id="sidebar_toggle_role_btn"
                  >
                    <UserIcon className="h-4 w-4 shrink-0" />
                    CAMBIAR ROL (DEMO)
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-rose-600 hover:bg-rose-50 font-black transition-colors focus:outline-none"
                  id="sidebar_logout_btn"
                >
                  <LogOut className="h-4 w-4" />
                  CERRAR SESIÓN
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden" id="main_pane_wrapper">
        
        {/* Mobile Header Bar */}
        <header className="md:hidden h-16 bg-[#063c25] border-b border-emerald-950 px-4 flex items-center justify-between shrink-0 sticky top-0 z-40 text-white" id="mobile_header">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("inicio")}>
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center font-black text-[#063c25] shadow">
              S
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-white block">SIEXPOL</span>
              <span className="text-[8px] font-bold text-emerald-300 block uppercase tracking-wider -mt-1.5">Ascenso PNP</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Badge */}
            <div className="h-8 w-8 rounded-full bg-emerald-800 border border-emerald-100 text-white flex items-center justify-center font-extrabold text-xs">
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            {/* Toggle Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-emerald-100 hover:text-white hover:bg-[#0a4e32] rounded-lg transition-colors focus:outline-none"
              id="mobile_menu_toggle"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </header>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#063c25] border-b border-emerald-950 px-4 py-4 space-y-4 absolute top-16 left-0 right-0 z-50 shadow-2xl animate-fade-in text-white" id="mobile_menu_panel">
            <div className="space-y-1">
              <p className="text-[9px] font-extrabold text-emerald-300 uppercase tracking-widest mb-1.5">Personal</p>
              {allowedPersonal.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-black transition-colors text-left uppercase ${
                      isActive
                        ? "bg-emerald-800 text-white border-l-4 border-amber-400"
                        : "text-emerald-100 hover:text-white hover:bg-emerald-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {allowedAdmin.length > 0 && (
              <div className="space-y-1">
                <p className="text-[9px] font-extrabold text-emerald-300 uppercase tracking-widest mb-1.5">Administración</p>
                {allowedAdmin.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-black transition-colors text-left uppercase ${
                        isActive
                          ? "bg-emerald-800 text-white border-l-4 border-amber-400"
                          : "text-emerald-100 hover:text-white hover:bg-emerald-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="border-t border-emerald-800 pt-3 mt-3">
              <div className="px-4 py-2 mb-2 space-y-1">
                <p className="text-[9px] text-emerald-300 font-bold uppercase tracking-wider">Sesión activa</p>
                <p className="text-xs text-white truncate font-bold">{user.email}</p>
                <span className={`inline-block text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                  user.rol === RolUsuario.ADMINISTRADOR 
                    ? "bg-rose-950/40 text-rose-300 border border-rose-800/50" 
                    : user.accesoCompleto 
                      ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/50" 
                      : "bg-amber-950/40 text-amber-300 border border-amber-800/50"
                }`}>
                  {user.rol === RolUsuario.ADMINISTRADOR 
                    ? "ADMINISTRADOR 👑" 
                    : user.accesoCompleto 
                      ? "ACCESO COMPLETO 🟢" 
                      : "DEMO LIMITADO 🟡"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left text-rose-300 hover:bg-rose-500/10 font-bold transition-colors focus:outline-none uppercase"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}

        {/* Top Header for Desktop */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 px-8 items-center justify-between shrink-0" id="desktop_header">
          {/* Badge styled title precisely as shown in the screenshot */}
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-[#034226] bg-[#e7f4ee] border border-emerald-200 px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                BANCO DE PREGUNTAS: SUBOFICIALES (ACTUALIZADO)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-black px-3 py-1 bg-slate-50 text-slate-600 rounded border border-slate-150 uppercase tracking-wide">
              AÑO DE CONCURSO: <span className="font-extrabold text-[#063c25]">PNP 2026</span>
            </span>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Acceso:</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                user.rol === RolUsuario.ADMINISTRADOR 
                  ? "bg-rose-50 text-rose-800 border-rose-100" 
                  : user.accesoCompleto 
                    ? "bg-emerald-50 text-emerald-850 border-emerald-150" 
                    : "bg-amber-50 text-amber-850 border-amber-150"
              }`}>
                {user.rol === RolUsuario.ADMINISTRADOR 
                  ? "ADMINISTRADOR" 
                  : user.accesoCompleto 
                    ? "ACCESO COMPLETO 🟢" 
                    : "DEMO LIMITADO 🟡"}
              </span>
              {onToggleRole && (
                <button
                  onClick={onToggleRole}
                  className="ml-1 bg-[#063c25] hover:bg-[#0a5434] text-white text-[9px] font-black px-2.5 py-1 rounded-lg transition-colors cursor-pointer uppercase tracking-wider shadow-sm"
                  title="Cambiar rol para probar ambas perspectivas"
                >
                  Alternar Vista (Demo)
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Body Scroll Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-8" id="layout_content">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}

            {/* Footer inside the view for seamless visual balance */}
            <footer className="pt-12 pb-6 text-center text-xs text-slate-400 border-t border-slate-200" id="layout_footer">
              <p className="font-bold text-slate-500">SIEXPOL • Sistema de Simuladores de Ascenso PNP</p>
              <p className="mt-1 text-[10px]">Basado en el Temario Oficial y Leyes Vigentes. Dirección de Recursos Humanos de la Policía Nacional del Perú.</p>
            </footer>
          </div>
        </main>
      </div>

      {/* Social Community Dialog / Modal */}
      {socialModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full space-y-5 text-center shadow-2xl">
            <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center mx-auto">
              <Share2 className="h-7 w-7 text-emerald-800" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-base text-slate-800 uppercase tracking-tight">Comunidad {socialModal.name}</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Únete a nuestros canales de estudio en {socialModal.name} para interactuar con otros postulantes, debatir preguntas difíciles y recibir actualizaciones en tiempo real.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSocialModal(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <a
                href={socialModal.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSocialModal(null)}
                className="flex-1 py-2.5 bg-[#063c25] hover:bg-[#0a5434] text-white rounded-xl text-xs font-black uppercase text-center transition-colors cursor-pointer flex items-center justify-center"
              >
                Unirse Ahora
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
