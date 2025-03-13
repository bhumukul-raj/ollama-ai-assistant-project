/**
 * @file lucide-react.d.ts
 * @description TypeScript declaration file that provides a compatibility layer
 * between Lucide React icons and Font Awesome icons.
 * 
 * This file allows the Ollama extension to use Font Awesome icons while maintaining
 * the API compatibility with Lucide React, which is commonly used in React projects.
 * It defines the necessary types and exports to simulate the Lucide React API, 
 * but the implementation will use Font Awesome components instead.
 * 
 * This approach enables the extension to:
 * 1. Use a familiar icon system (Font Awesome) that's already available in JupyterLab
 * 2. Maintain code that looks like it's using Lucide React for better portability
 * 3. Avoid adding an additional icon library dependency
 */

// This is a compatibility layer to use Font Awesome icons instead of Lucide React
declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';

  /**
   * Props interface for icon components
   * 
   * @interface IconProps
   * @extends SVGProps<SVGSVGElement>
   * @property {string|number} [size] - Icon size (can be CSS units or numeric value)
   * @property {string} [color] - Icon color (CSS color value)
   * @property {string|number} [stroke] - Stroke width for the icon
   */
  export type IconProps = SVGProps<SVGSVGElement> & {
    size?: string | number;
    color?: string;
    stroke?: string | number;
  };

  /**
   * Type definition for an icon component
   * Represents any icon component that accepts IconProps
   */
  export type Icon = ComponentType<IconProps>;

  /**
   * Lucide icon components mapped to Font Awesome equivalents
   * 
   * Each export below represents a Lucide icon name, but the actual
   * implementation will use the corresponding Font Awesome icon.
   * Comments indicate which Font Awesome icon will be used.
   */
  export const MessageSquare: Icon;     // fa-comment
  export const Send: Icon;               // fa-paper-plane
  export const ArrowRight: Icon;         // fa-arrow-right
  export const X: Icon;                  // fa-times
  export const RefreshCw: Icon;          // fa-sync
  export const StopCircle: Icon;         // fa-stop-circle
  export const Code: Icon;               // fa-code
  export const FileText: Icon;           // fa-file-alt
  export const Zap: Icon;                // fa-bolt
  export const Loader: Icon;             // fa-spinner
  export const CheckCircle: Icon;        // fa-check-circle
  export const AlertCircle: Icon;        // fa-exclamation-circle
  export const Search: Icon;             // fa-search
  export const Trash: Icon;              // fa-trash
  export const Copy: Icon;               // fa-copy
  export const Settings: Icon;           // fa-cog
} 