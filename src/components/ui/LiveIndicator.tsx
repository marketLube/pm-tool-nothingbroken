import React from 'react';
import { Wifi, WifiOff, RotateCw, RefreshCcw } from 'lucide-react';
import { useRealtime } from '../../contexts/RealtimeContext';

interface LiveIndicatorProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const LiveIndicator: React.FC<LiveIndicatorProps> = ({ 
  className = '', 
  showText = true, 
  size = 'md' 
}) => {
  const { status, isSubscribed, reconnect } = useRealtime();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4 text-xs';
      case 'lg':
        return 'h-6 w-6 text-lg';
      default:
        return 'h-5 w-5 text-sm';
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'connecting':
        return {
          icon: RotateCw,
          text: 'Connecting...',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          pulseColor: 'bg-yellow-400',
          showRetry: false,
          tooltip: 'Establishing real-time connection...'
        };
      case 'live':
        return {
          icon: Wifi,
          text: 'Live',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          iconColor: 'text-green-600',
          pulseColor: 'bg-green-400',
          showRetry: false,
          tooltip: 'Real-time sync active - changes will appear instantly'
        };
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          text: 'Disconnected',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          pulseColor: 'bg-red-400',
          showRetry: true,
          tooltip: 'Real-time sync disconnected - click retry to reconnect'
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  const handleRetry = () => {
    console.log('[LiveIndicator] User initiated manual reconnection');
    reconnect();
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Status Indicator */}
      <div 
        className={`
          inline-flex items-center space-x-2 px-3 py-1.5 rounded-full 
          ${config.bgColor} ${config.textColor} 
          transition-all duration-300 ease-in-out
          border border-opacity-20 border-current
          ${config.showRetry ? 'hover:shadow-md cursor-pointer' : ''}
          group relative
        `}
        title={config.tooltip}
        onClick={config.showRetry ? handleRetry : undefined}
      >
        {/* Status Icon with Animation */}
        <div className="relative">
          <IconComponent 
            className={`
              ${getSizeClasses()} ${config.iconColor}
              ${status === 'connecting' ? 'animate-spin' : ''}
              ${config.showRetry ? 'group-hover:scale-110' : ''}
              transition-transform duration-200
            `} 
          />
          
          {/* Pulse Animation for Live Status */}
          {status === 'live' && (
            <div className={`
              absolute inset-0 ${config.pulseColor} rounded-full 
              animate-ping opacity-20
            `} />
          )}
        </div>

        {/* Status Text */}
        {showText && (
          <span className={`
            font-medium text-sm
            ${config.showRetry ? 'group-hover:underline' : ''}
            transition-all duration-200
          `}>
            {config.text}
          </span>
        )}

        {/* Retry Button (Only for Disconnected) */}
        {config.showRetry && (
          <RefreshCcw className={`
            h-4 w-4 ${config.iconColor} 
            group-hover:rotate-180 transition-transform duration-300
            opacity-60 group-hover:opacity-100
          `} />
        )}

        {/* Tooltip */}
        <div className={`
          absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
          bg-gray-800 text-white text-xs rounded-md px-2 py-1
          opacity-0 group-hover:opacity-100 pointer-events-none
          transition-opacity duration-200 whitespace-nowrap z-50
        `}>
          {config.tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
        </div>
      </div>

      {/* Connection Status Indicator Dot */}
      <div className={`
        absolute -top-1 -right-1 w-3 h-3 rounded-full
        ${status === 'live' ? 'bg-green-400' : 
          status === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'}
        ${status === 'live' ? 'animate-pulse' : ''}
        border-2 border-white shadow-sm
      `} />
    </div>
  );
};

export default LiveIndicator; 