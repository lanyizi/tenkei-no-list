declare module 'vue-timers' {
  import Vue, { PluginFunction } from 'vue'

  type TimerObject = {
    /**
     * Name of timer
     * 
     * Default: timer key (with object notation)
     */
    name?: string;
  
    /**
     * Tick callback or method name from component
     * 
     * Note: callback is binded to component instance
     * 
     * Default: name
     */
    callback?: Function | string;
  
    /**
     * Autostart timer from created hook
     * 
     * Default: false
     */
    autostart?: boolean;
  
    /**
     * Set true to repeat (with setInterval) or false (setTimeout)
     * 
     * Default: false
     */
    repeat?: boolean;
  
    /**
     * Set true to call first tick immediate 
     * 
     * Note: repeat must be true too
     * 
     * Default: false
     */
    immediate?: boolean;
  
    /**
     * Time between ticks
     * 
     * Default: 1000
     */
    time?: number;
    
    /**
     * Switch timer`s status between activated and deactivated
     * 
     * Default: false
     */
    isSwitchTab?: boolean;
  }

  export default class VueTimers {
    static install: PluginFunction<never>
  }
}