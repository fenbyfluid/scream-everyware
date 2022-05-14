import { Mode, PulseWidthSwitch, TriggerModeSwitch } from './X1';

interface IModeInfo {
  readonly name: string;

  getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch, triggerModeSwitchValue: TriggerModeSwitch): string | null;
}

export const ModeInfo: { [Property in Mode]: IModeInfo; } = {
  [Mode.Torment]: {
    name: 'Torment',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch): string | null {
      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Short Pulse: 60us';
        case PulseWidthSwitch.Normal:
          return 'Normal Pulse: 130us';
        case PulseWidthSwitch.Medium:
          return 'Medium Pulse: 250us';
        case PulseWidthSwitch.Long:
          return 'Long Pulse: 510us';
      }
    },
  },
  [Mode.SmoothSuffering]: {
    name: 'Smooth Suffering',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch): string | null {
      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Short: 1000Hz';
        case PulseWidthSwitch.Normal:
          return 'Normal: 750Hz';
        case PulseWidthSwitch.Medium:
          return 'Medium: 550Hz';
        case PulseWidthSwitch.Long:
          return 'Long: 405Hz';
      }
    },
  },
  [Mode.BitchTraining]: {
    name: 'Bitch Training',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch): string | null {
      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Short Pulse: 60us';
        case PulseWidthSwitch.Normal:
          return 'Normal Pulse: 130us';
        case PulseWidthSwitch.Medium:
          return 'Medium Pulse: 255us';
        case PulseWidthSwitch.Long:
          return 'Long Pulse: 510us';
      }
    },
  },
  [Mode.TurboThruster]: {
    name: 'Turbo Thruster',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch): string | null {
      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Short: 1000Hz';
        case PulseWidthSwitch.Normal:
          return 'Normal: 675Hz';
        case PulseWidthSwitch.Medium:
          return 'Medium: 450Hz';
        case PulseWidthSwitch.Long:
          return 'Long: 300Hz';
      }
    },
  },
  [Mode.Random]: {
    name: 'Random',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch, triggerModeSwitchValue: TriggerModeSwitch): string | null {
      if (triggerModeSwitchValue === TriggerModeSwitch.Audio) {
        switch (pulseWidthSwitchValue) {
          case PulseWidthSwitch.Short:
            return 'Audio trigger on 1 sec';
          case PulseWidthSwitch.Normal:
            return 'Audio trigger on 2 sec';
          case PulseWidthSwitch.Medium:
            return 'Audio trigger on 4 sec';
          case PulseWidthSwitch.Long:
            return 'Audio trigger on 8 sec';
        }
      }

      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Channels: Any 1 of 4';
        case PulseWidthSwitch.Normal:
          return 'Channels: Any 2 of 4 or all';
        case PulseWidthSwitch.Medium:
          return 'Channels: 1+2 or 3+4 or all';
        case PulseWidthSwitch.Long:
          return 'Channels: All on';
      }
    },
  },
  [Mode.RandomBitch]: {
    name: 'Random Bitch',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch, triggerModeSwitchValue: TriggerModeSwitch): string | null {
      if (triggerModeSwitchValue === TriggerModeSwitch.Audio) {
        switch (pulseWidthSwitchValue) {
          case PulseWidthSwitch.Short:
            return 'Audio trigger on 1 sec';
          case PulseWidthSwitch.Normal:
            return 'Audio trigger on 2 sec';
          case PulseWidthSwitch.Medium:
            return 'Audio trigger on 4 sec';
          case PulseWidthSwitch.Long:
            return 'Audio trigger on 8 sec';
        }
      }

      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Channels: Any 1 of 4';
        case PulseWidthSwitch.Normal:
          return 'Channels: Any 2 of 4 or all';
        case PulseWidthSwitch.Medium:
          return 'Channels: 1+2 or 3+4 or all';
        case PulseWidthSwitch.Long:
          return 'Channels: All on';
      }
    },
  },
  [Mode.Purgatory]: {
    name: 'Purgatory',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch): string | null {
      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Short Pulse: 60us';
        case PulseWidthSwitch.Normal:
          return 'Normal Pulse: 130us';
        case PulseWidthSwitch.Medium:
          return 'Medium Pulse: 250us';
        case PulseWidthSwitch.Long:
          return 'Long Pulse: 510us';
      }
    },
  },
  [Mode.PurgatoryChaos]: {
    name: 'Purgatory Chaos',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch): string | null {
      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Short Pulse: 60us';
        case PulseWidthSwitch.Normal:
          return 'Normal Pulse: 130us';
        case PulseWidthSwitch.Medium:
          return 'Medium Pulse: 250us';
        case PulseWidthSwitch.Long:
          return 'Long Pulse: 510us';
      }
    },
  },
  [Mode.PersistentPain]: {
    name: 'Persistent Pain',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch, triggerModeSwitchValue: TriggerModeSwitch): string | null {
      if (triggerModeSwitchValue === TriggerModeSwitch.Continuous) {
        switch (pulseWidthSwitchValue) {
          case PulseWidthSwitch.Short:
            return 'All channels on';
          case PulseWidthSwitch.Normal:
            return 'Channels 1+2 on, 3+4 pulse';
          case PulseWidthSwitch.Medium:
            return 'Channels 1+2 on, 3+4 alternating';
          case PulseWidthSwitch.Long:
            return 'Channels 1+2 on, 3+4 sweep';
        }
      }

      if (triggerModeSwitchValue === TriggerModeSwitch.Pulse) {
        switch (pulseWidthSwitchValue) {
          case PulseWidthSwitch.Short:
            return 'Pulse alternating 1+2 and 3+4';
          case PulseWidthSwitch.Normal:
            return 'Random pair 1+2 and 3+4';
          case PulseWidthSwitch.Medium:
            return 'Random any two channels or all';
          case PulseWidthSwitch.Long:
            return 'Sweep alternating 1+2 and 3+4';
        }
      }

      return null;
    },
  },
  [Mode.Pulse]: {
    name: 'Pulse',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch, triggerModeSwitchValue: TriggerModeSwitch): string | null {
      if (triggerModeSwitchValue === TriggerModeSwitch.Continuous) {
        switch (pulseWidthSwitchValue) {
          case PulseWidthSwitch.Short:
            return 'All channels on';
          case PulseWidthSwitch.Normal:
            return 'Channels 1+2 on, 3+4 pulse';
          case PulseWidthSwitch.Medium:
            return 'Channels 1+2 on, 3+4 alternating';
          case PulseWidthSwitch.Long:
            return 'Channels 1+2 on, 3+4 sweep';
        }
      }

      if (triggerModeSwitchValue === TriggerModeSwitch.Pulse) {
        switch (pulseWidthSwitchValue) {
          case PulseWidthSwitch.Short:
            return 'Pulse alternating 1+2 and 3+4';
          case PulseWidthSwitch.Normal:
            return 'Random pair 1+2 and 3+4';
          case PulseWidthSwitch.Medium:
            return 'Random any two channels or all';
          case PulseWidthSwitch.Long:
            return 'Sweep alternating 1+2 and 3+4';
        }
      }

      return null;
    },
  },
  [Mode.RampPulse]: {
    name: 'Ramp Pulse',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch, triggerModeSwitchValue: TriggerModeSwitch): string | null {
      if (triggerModeSwitchValue === TriggerModeSwitch.Audio) {
        return null;
      }

      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Pulse repeat 1.2 sec';
        case PulseWidthSwitch.Normal:
          return 'Pulse repeat 2.5 sec';
        case PulseWidthSwitch.Medium:
          return 'Pulse repeat 5.1 sec';
        case PulseWidthSwitch.Long:
          return 'Pulse repeat 10.2 sec';
      }
    },
  },
  [Mode.RampRepeat]: {
    name: 'Ramp Repeat',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch, triggerModeSwitchValue: TriggerModeSwitch): string | null {
      if (triggerModeSwitchValue === TriggerModeSwitch.Audio) {
        return null;
      }

      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Pulse repeat 1.2 sec';
        case PulseWidthSwitch.Normal:
          return 'Pulse repeat 2.5 sec';
        case PulseWidthSwitch.Medium:
          return 'Pulse repeat 5.1 sec';
        case PulseWidthSwitch.Long:
          return 'Pulse repeat 10.2 sec';
      }
    },
  },
  [Mode.RampIntensity]: {
    name: 'Ramp Intensity',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch, triggerModeSwitchValue: TriggerModeSwitch): string | null {
      if (triggerModeSwitchValue === TriggerModeSwitch.Audio) {
        return null;
      }

      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Ramp depth 0-100%';
        case PulseWidthSwitch.Normal:
          return 'Ramp depth 25-100%';
        case PulseWidthSwitch.Medium:
          return 'Ramp depth 50-100%';
        case PulseWidthSwitch.Long:
          return 'Ramp depth 75-100%';
      }
    },
  },
  [Mode.AudioAttack]: {
    name: 'Audio Attack',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch, triggerModeSwitchValue: TriggerModeSwitch): string | null {
      if (triggerModeSwitchValue !== TriggerModeSwitch.Audio) {
        return null;
      }

      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Beat Bounce';
        case PulseWidthSwitch.Normal:
          return 'All Channels';
        case PulseWidthSwitch.Medium:
          return 'Back Beat';
        case PulseWidthSwitch.Long:
          return 'Random Strobes';
      }
    },
  },
  [Mode.TormentLowVoltage]: {
    name: 'Torment (LV)',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch): string | null {
      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Short Pulse: 130us';
        case PulseWidthSwitch.Normal:
          return 'Normal Pulse: 180us';
        case PulseWidthSwitch.Medium:
          return 'Medium Pulse: 250us';
        case PulseWidthSwitch.Long:
          return 'Long Pulse: 510us';
      }
    },
  },
  [Mode.PowerWavesLowVoltage]: {
    name: 'Power Waves (LV)',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch): string | null {
      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Drift';
        case PulseWidthSwitch.Normal:
          return 'Power Waves';
        case PulseWidthSwitch.Medium:
          return 'Intense sweep';
        case PulseWidthSwitch.Long:
          return 'Up sweeps';
      }
    },
  },
  [Mode.SpeedWaves]: {
    name: 'Speed Waves',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch): string | null {
      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Throb';
        case PulseWidthSwitch.Normal:
          return 'Fast sweep';
        case PulseWidthSwitch.Medium:
          return 'Speed waves';
        case PulseWidthSwitch.Long:
          return 'Upstrokes';
      }
    },
  },
  [Mode.DemonPlay]: {
    name: 'Demon Play',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch): string | null {
      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Hard throb';
        case PulseWidthSwitch.Normal:
          return 'Hard throb ramp';
        case PulseWidthSwitch.Medium:
          return 'Hell fire';
        case PulseWidthSwitch.Long:
          return 'Hell fire ramp';
      }
    },
  },
  [Mode.ExtremeTorment]: {
    name: 'Extreme Torment',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch): string | null {
      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Short Pulse: 60us';
        case PulseWidthSwitch.Normal:
          return 'Normal Pulse: 130us';
        case PulseWidthSwitch.Medium:
          return 'Medium Pulse: 250us';
        case PulseWidthSwitch.Long:
          return 'Long Pulse: 510us';
      }
    },
  },
  [Mode.ExtremeBitchTraining]: {
    name: 'Extreme Bitch Training',
    getPulseWidthSwitchLabel(pulseWidthSwitchValue: PulseWidthSwitch): string | null {
      switch (pulseWidthSwitchValue) {
        case PulseWidthSwitch.Short:
          return 'Short Pulse: 60us';
        case PulseWidthSwitch.Normal:
          return 'Normal Pulse: 130us';
        case PulseWidthSwitch.Medium:
          return 'Medium Pulse: 255us';
        case PulseWidthSwitch.Long:
          return 'Long Pulse: 510us';
      }
    },
  },
};
