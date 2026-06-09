import { StorageUtil } from '../storage';

const THEME_KEY = "app_theme"; // 与GeneralSettings中的键名保持一致

// 主题映射表：主题值 → { darkClass: 'dark'|'light'|'', label: string }
const THEME_MAP: Record<string, { darkClass: string; label: string }> = {
  'system':      { darkClass: '',        label: '跟随系统' },
  'light':       { darkClass: 'light',   label: '亮色(默认)' },
  'light-warm':  { darkClass: 'light',   label: '暖白' },
  'dark':        { darkClass: 'dark',    label: '暗色(默认)' },
  'dark-deep':   { darkClass: 'dark',    label: '深邃黑' },
  'dark-warm':   { darkClass: 'dark',    label: '暗暖' },
};

/**
 * 主题初始化服务
 * 在应用启动时立即读取和应用用户的主题偏好设置
 */
export class ThemeInitializer {
  private static initialized = false;

  /**
   * 初始化主题设置
   * 在应用启动时立即调用，避免主题闪烁
   */
  static async initializeTheme(): Promise<void> {
    if (this.initialized || typeof document === 'undefined') {
      return;
    }

    try {
      console.log('🎨 [ThemeInitializer] 开始初始化主题设置...');
      
      // 读取用户保存的主题设置
      const savedTheme = await StorageUtil.getItem<string>(THEME_KEY, "system");
      const theme = savedTheme || "system";
      
      console.log(`🎨 [ThemeInitializer] 用户主题偏好: ${theme}`);
      
      // 立即应用主题设置
      this.applyTheme(theme);
      
      this.initialized = true;
      console.log('✅ [ThemeInitializer] 主题初始化完成');
    } catch (error) {
      console.error('❌ [ThemeInitializer] 主题初始化失败:', error);
      // 即使失败也要应用默认主题，避免界面异常
      this.applyTheme("system");
    }
  }

  /**
   * 应用主题设置
   * @param theme 主题类型: "system" | "light" | "light-warm" | "dark" | "dark-deep" | "dark-warm"
   */
  static applyTheme(theme: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    
    // 设置 data-theme 属性（用于 CSS 变量级联）
    root.setAttribute('data-theme', theme);

    // 确定亮暗类
    const map = THEME_MAP[theme] || { darkClass: '' };
    
    // 移除现有的主题类
    root.classList.remove("dark", "light");
    
    if (map.darkClass === 'dark') {
      root.classList.add("dark");
      console.log(`🌙 [ThemeInitializer] 应用暗色主题: ${theme}`);
    } else if (map.darkClass === 'light') {
      root.classList.add("light");
      console.log(`☀️ [ThemeInitializer] 应用亮色主题: ${theme}`);
    } else {
      // system 主题：根据系统偏好自动切换
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
        console.log('🌙 [ThemeInitializer] 应用系统暗色主题');
      } else {
        root.classList.add("light");
        console.log('☀️ [ThemeInitializer] 应用系统亮色主题');
      }
    }
  }

  /**
   * 监听系统主题变化（仅对system主题有效）
   */
  static setupSystemThemeListener(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // 监听系统主题变化
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleThemeChange = async () => {
      try {
        const savedTheme = await StorageUtil.getItem<string>(THEME_KEY, "system");
        if (savedTheme === "system") {
          this.applyTheme("system");
        }
      } catch (error) {
        console.error('❌ [ThemeInitializer] 系统主题变化处理失败:', error);
      }
    };

    // 添加监听器
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleThemeChange);
    } else {
      // 兼容旧版浏览器
      mediaQuery.addListener(handleThemeChange);
    }

    console.log('👂 [ThemeInitializer] 系统主题变化监听器已设置');
  }

  /**
   * 获取当前主题值
   */
  static getCurrentTheme(): string {
    if (typeof document === 'undefined') {
      return "system";
    }
    return document.documentElement.getAttribute('data-theme') || "system";
  }

  /**
   * 检查是否为暗色主题
   */
  static isDarkMode(): boolean {
    if (typeof document === 'undefined') {
      return false;
    }
    return document.documentElement.classList.contains("dark");
  }

  /**
   * 同步主题设置到存储
   * @param theme 主题类型
   */
  static async syncThemeToStorage(theme: string): Promise<void> {
    try {
      await StorageUtil.setItem(THEME_KEY, theme);
      console.log(`💾 [ThemeInitializer] 主题设置已同步到存储: ${theme}`);
    } catch (error) {
      console.error('❌ [ThemeInitializer] 主题设置同步失败:', error);
    }
  }
}

/**
 * 快速主题初始化函数
 * 用于在应用启动时立即执行，避免主题闪烁
 */
export async function initializeThemeOnStartup(): Promise<void> {
  await ThemeInitializer.initializeTheme();
  ThemeInitializer.setupSystemThemeListener();
} 
