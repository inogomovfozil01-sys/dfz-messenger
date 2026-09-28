'use client';

import React, { useState } from 'react';
import { BrandMark } from '../ui/BrandMark';
import {
  Download,
  Share2,
  PlusSquare,
  ShieldCheck,
  Zap,
  Bell,
  Smartphone,
  Laptop,
  CheckCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';

interface PwaInstallGateProps {
  onBypass?: () => void;
  title?: string;
  description?: string;
}

export const PwaInstallGate: React.FC<PwaInstallGateProps> = ({
  onBypass,
  title = 'Вход через DFZ Messenger PWA',
  description = 'Для регистрации, входа и полноценной работы мессенджера установите официальное PWA-приложение на ваше устройство.',
}) => {
  const {
    isStandalone,
    canInstall,
    isIos,
    isAndroid,
    isDesktop,
    promptInstall,
    bypassPwa,
  } = usePwaInstall();

  const [installTriggered, setInstallTriggered] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);

  const handleInstallClick = async () => {
    setInstallTriggered(true);
    const success = await promptInstall();
    if (!success) {
      setShowManualSteps(true);
    }
  };

  const handleBypassClick = () => {
    bypassPwa();
    if (onBypass) onBypass();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0e141b] text-dfz-text">
      <div className="w-full max-w-md bg-[#151d26] border border-[#26323e] rounded-dfz-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-scale-in relative overflow-hidden">
        {/* Subtle Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-dfz-accent/15 rounded-full blur-3xl pointer-events-none" />

        {/* App Emblem & Brand Header */}
        <div className="space-y-3 relative">
          <div className="relative w-16 h-16 mx-auto">
            <BrandMark className="w-16 h-16 shadow-lg shadow-dfz-accent/20 rounded-2xl" />
            <div className="absolute -bottom-1 -right-1 p-1 bg-[#151d26] rounded-full border border-[#26323e]">
              <ShieldCheck size={14} className="text-cyan-400" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-dfz-accent/10 border border-dfz-accent/25 text-dfz-accent text-[11px] font-semibold mb-2">
              <Smartphone size={12} />
              <span>Официальный PWA Клиент</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-dfz-text">{title}</h1>
            <p className="text-xs text-dfz-text-muted mt-1 leading-relaxed max-w-xs mx-auto">
              {description}
            </p>
          </div>
        </div>

        {/* Telegram-style Advantages Grid */}
        <div className="grid grid-cols-2 gap-2 text-left text-xs">
          <div className="p-3 rounded-dfz-xl bg-[#0e141b] border border-[#26323e] space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
              <Zap size={13} />
              <span>120 FPS Скорость</span>
            </div>
            <p className="text-[10px] text-dfz-text-muted leading-tight">
              Аппаратное ускорение и мгновенное открытие диалогов.
            </p>
          </div>

          <div className="p-3 rounded-dfz-xl bg-[#0e141b] border border-[#26323e] space-y-1">
            <div className="flex items-center gap-1.5 text-purple-400 font-semibold text-[11px]">
              <Bell size={13} />
              <span>Push-уведомления</span>
            </div>
            <p className="text-[10px] text-dfz-text-muted leading-tight">
              Системные звонки и оповещения даже при закрытом окне.
            </p>
          </div>

          <div className="p-3 rounded-dfz-xl bg-[#0e141b] border border-[#26323e] space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <ShieldCheck size={13} />
              <span>Шифрование сессий</span>
            </div>
            <p className="text-[10px] text-dfz-text-muted leading-tight">
              Защищенная среда выполнения без внешних расширений.
            </p>
          </div>

          <div className="p-3 rounded-dfz-xl bg-[#0e141b] border border-[#26323e] space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
              <Download size={13} />
              <span>Оффлайн-кэш</span>
            </div>
            <p className="text-[10px] text-dfz-text-muted leading-tight">
              Доступ к сохраненным сообщениям и медиа без сети.
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="space-y-3 pt-1">
          <button
            onClick={handleInstallClick}
            className="w-full h-11 flex items-center justify-center gap-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-bold rounded-dfz-xl transition-all shadow-md shadow-dfz-accent/20"
          >
            <Download size={15} />
            <span>Установить PWA на устройство</span>
          </button>

          {/* Manual platform guide if automatic prompt is not available */}
          {(showManualSteps || isIos) && (
            <div className="p-3.5 rounded-dfz-xl bg-[#0e141b] border border-[#26323e] text-left text-xs space-y-2 text-dfz-text-muted">
              <span className="font-semibold text-dfz-text text-[11px] block">
                {isIos ? 'Инструкция для Apple iOS (Safari):' : 'Как установить приложение вручную:'}
              </span>
              {isIos ? (
                <ol className="list-decimal list-inside space-y-1 text-[11px]">
                  <li>Нажмите кнопку «Поделиться» (иконка квадрата со стрелкой) в Safari.</li>
                  <li>Прокрутите меню и выберите «На экран «Домой»».</li>
                  <li>Нажмите «Добавить» в правом верхнем углу.</li>
                  <li>Запустите DFZ Messenger с экрана приложений!</li>
                </ol>
              ) : (
                <ol className="list-decimal list-inside space-y-1 text-[11px]">
                  <li>Нажмите иконку установки ⊕ в адресной строке браузера справа.</li>
                  <li>Или откройте меню браузера (⋮) и выберите «Установить DFZ Messenger».</li>
                  <li>Приложение появится на рабочем столе и панели задач.</li>
                </ol>
              )}
            </div>
          )}

          {/* Secondary Bypass Button (for web testing & fallback) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleBypassClick}
              className="text-xs text-dfz-text-muted hover:text-dfz-text underline transition-colors"
            >
              Продолжить в браузере (Web-версия / Режим разработчика)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
