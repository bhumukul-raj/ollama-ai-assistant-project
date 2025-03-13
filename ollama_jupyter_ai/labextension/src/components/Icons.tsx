/**
 * @file Icons.tsx
 * @description This file provides a compatibility layer that maps the Lucide React icon interface 
 * to Font Awesome icons. It allows the application to use Font Awesome icons while maintaining
 * a consistent interface that matches Lucide React's API. This approach enables easy switching
 * between icon libraries without changing the component usage throughout the application.
 */
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faComment,
  faPaperPlane,
  faArrowRight,
  faTimes,
  faSync,
  faStopCircle,
  faCode,
  faFileAlt,
  faBolt,
  faSpinner,
  faCheckCircle,
  faExclamationCircle,
  faSearch,
  faTrash,
  faCopy,
  faCog
} from '@fortawesome/free-solid-svg-icons';
import { IconProps } from 'lucide-react';

/**
 * Factory function that creates a component which wraps a Font Awesome icon
 * but follows the Lucide React interface, allowing for consistent API usage.
 *
 * @param {IconProp} icon - The Font Awesome icon to use
 * @returns {React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>} - A React component matching the Lucide API
 */
const createFontAwesomeIcon = (icon: IconProp) => {
  return React.forwardRef<SVGSVGElement, IconProps>((props, ref) => {
    const { size, color, stroke, ...otherProps } = props;
    return (
      <FontAwesomeIcon
        icon={icon}
        style={{
          width: size,
          height: size,
          color: color
        }}
        {...otherProps as any}
        ref={ref as any}
      />
    );
  });
};

// Export components with the same names as in Lucide React
/**
 * MessageSquare icon - Represents chat or message functionality
 * Maps to Font Awesome's comment icon
 */
export const MessageSquare = createFontAwesomeIcon(faComment);

/**
 * Send icon - Represents sending a message or submitting a form
 * Maps to Font Awesome's paper plane icon
 */
export const Send = createFontAwesomeIcon(faPaperPlane);

/**
 * ArrowRight icon - Represents forward navigation or next steps
 * Maps to Font Awesome's arrow right icon
 */
export const ArrowRight = createFontAwesomeIcon(faArrowRight);

/**
 * X icon - Represents close, cancel, or clear actions
 * Maps to Font Awesome's times icon
 */
export const X = createFontAwesomeIcon(faTimes);

/**
 * RefreshCw icon - Represents refresh, reload, or regenerate actions
 * Maps to Font Awesome's sync icon
 */
export const RefreshCw = createFontAwesomeIcon(faSync);

/**
 * StopCircle icon - Represents stop or cancel operations
 * Maps to Font Awesome's stop circle icon
 */
export const StopCircle = createFontAwesomeIcon(faStopCircle);

/**
 * Code icon - Represents code snippets or programming features
 * Maps to Font Awesome's code icon
 */
export const Code = createFontAwesomeIcon(faCode);

/**
 * FileText icon - Represents documents or text files
 * Maps to Font Awesome's file alt icon
 */
export const FileText = createFontAwesomeIcon(faFileAlt);

/**
 * Zap icon - Represents quick actions or performance features
 * Maps to Font Awesome's bolt icon
 */
export const Zap = createFontAwesomeIcon(faBolt);

/**
 * Loader icon - Represents loading or processing states
 * Maps to Font Awesome's spinner icon
 */
export const Loader = createFontAwesomeIcon(faSpinner);

/**
 * CheckCircle icon - Represents success or completion
 * Maps to Font Awesome's check circle icon
 */
export const CheckCircle = createFontAwesomeIcon(faCheckCircle);

/**
 * AlertCircle icon - Represents warnings or important notices
 * Maps to Font Awesome's exclamation circle icon
 */
export const AlertCircle = createFontAwesomeIcon(faExclamationCircle);

/**
 * Search icon - Represents search functionality
 * Maps to Font Awesome's search icon
 */
export const Search = createFontAwesomeIcon(faSearch);

/**
 * Trash icon - Represents delete or remove actions
 * Maps to Font Awesome's trash icon
 */
export const Trash = createFontAwesomeIcon(faTrash);

/**
 * Copy icon - Represents copy to clipboard functionality
 * Maps to Font Awesome's copy icon
 */
export const Copy = createFontAwesomeIcon(faCopy);

/**
 * Settings icon - Represents configuration or preferences
 * Maps to Font Awesome's cog icon
 */
export const Settings = createFontAwesomeIcon(faCog); 