/**
 * STRATEGIC_CONSTANTS
 * These parameters govern the temporal mechanics of the Mission Control system.
 */

export const SCHEDULING_CONFIG = {
  /**
   * BUFFER_TIME: Minutes required between missions for sterilization and reset.
   */
  BUFFER_TIME: 10,
  
  /**
   * SLOT_INTERVAL: The step size (in minutes) for generating potential booking starts.
   */
  SLOT_INTERVAL: 15,
  
  /**
   * DEFAULT_MISSION_DURATION: Fallback duration if service parameters are undefined.
   */
  DEFAULT_MISSION_DURATION: 30,
};
