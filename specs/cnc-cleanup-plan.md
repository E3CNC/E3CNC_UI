# CNC Cleanup Plan — Remove 3D-Printer-Only Features

## Goal

Strip all 3D-printer-specific functionality from the Mainsail-CNC fork, retaining only features that are relevant to CNC machine control (mills, routers, lasers, plasma cutters).

## Guiding Principle

If a feature exists solely because 3D printers need it and CNC machines don't, it goes.
If a feature is generic (temperature control, file management, G-code sending) it stays or gets trimmed.

---

## Phase 1: Farm / Multi-Printer (`/allPrinters`)

### Files to delete
| File | Reason |
|---|---|
| `src/pages/Farm.vue` | Farm dashboard page |
| `src/components/panels/FarmPrinterPanel.vue` | Farm printer card |
| `src/components/ui/PrinterSelector.vue` | Printer selection widget |
| `src/components/TheSelectPrinterDialog.vue` | Multi-printer connection dialog |
| `src/components/settings/SettingsRemotePrintersTab.vue` | Remote printer settings |
| `src/store/farm/` (entire directory) | Farm store module |
| `src/store/gui/remoteprinters/` (entire directory) | Remote printer GUI state |

### Files to edit
| File | Change |
|---|---|
| `src/routes/index.ts` | Remove `farm` route (name:`'farm'`, path:`'/allPrinters'`) |
| `src/store/index.ts` | Remove `import { farm }` and `farm` from modules |
| `src/composables/useNavigation.ts` | Remove `countPrinters`, remove `/allPrinters` nav entry |
| `src/components/TheTopbar.vue` | Remove printer counter badge |
| `src/components/ui/SidebarItem.vue` | Remove special `/allPrinters` border styling |
| `src/store/actions.ts` | Remove `farm/` dispatch |
| `src/store/gui/actions.ts` | Remove `remoteprinters/` init in `initStore` |

---

## Phase 2: Timelapse (`/timelapse`)

### Files to delete
| File | Reason |
|---|---|
| `src/pages/Timelapse.vue` | Timelapse page |
| `src/components/panels/Timelapse/` (entire directory) | Timelapse panels |
| `src/components/TheTimelapseRenderingSnackbar.vue` | Rendering progress snackbar |
| `src/components/dialogs/StartPrintDialogTimelapse.vue` | Timelapse start-print dialog |
| `src/components/dialogs/TimelapseRenderingsettingsDialog.vue` | Render settings dialog |
| `src/composables/useTimelapse.ts` | Timelapse composable |
| `src/store/server/timelapse/` (entire directory) | Timelapse store module |

### Files to edit
| File | Change |
|---|---|
| `src/routes/index.ts` | Remove `timelapse` route |
| `src/store/index.ts` | Remove `import { timelapse }` from server module line |
| `src/store/server/index.ts` | Remove `timelapse` import and registration |
| `src/store/server/types.ts` | Remove `ServerTimelapseState` |
| `src/store/variables.ts` | Remove `'timelapse'` from `initableServerComponents`, `hiddenRootDirectories`, `excludeKeys`, console filter lists |
| `src/store/gui/index.ts` | Remove `view.timelapse` defaults |
| `src/store/gui/types.ts` | Remove `view.timelapse` type |
| `src/App.vue` | Remove `<the-timelapse-rendering-snackbar />` |
| `src/components/console/Console.vue` | Remove timelapse console filters |
| `src/components/console/MinicomponentPanel.vue` | Remove timelapse console filters |
| `src/composables/useSettingsDatabase.ts` | Remove `'timelapse'` namespace ref |
| `src/store/socket/actions.ts` | Remove `notify_timelapse_event` handler |
| `src/store/gui/actions.ts` | Remove timelapse migration handlers |

---

## Phase 3: Bed Mesh / Bed Screws / Bed Tilt

### Files to delete
| File | Reason |
|---|---|
| `src/composables/useBedMesh.ts` | Bed mesh profile composable |
| `src/components/dialogs/TheBedScrewsDialog.vue` | Bed screw adjustment dialog |

### Files to edit
| File | Change |
|---|---|
| `src/App.vue` | Remove `<the-bed-screws-dialog />` |
| `src/store/printer/actions.ts` | Remove bed_mesh profile handling |
| `src/store/printer/mutations.ts` | Remove `setBedMeshProfiles`, profile deletion |
| `src/store/printer/getters.ts` | Remove `existsBedTilt`, `existsBedScrews` getters |
| `src/composables/useDashboard.ts` | Remove `'bed_mesh'` panel case if present |
| `src/components/settings/SettingsUiSettingsTab.vue` | Remove `boolBedScrewsDialog`, `hideSaveConfigForBedMash` |
| `src/store/gui/types.ts` | Remove `boolBedScrewsDialog`, `hideSaveConfigForBedMash` |
| `src/store/gui/index.ts` | Remove default values for above |

---

## Phase 4: Z-Offset / Z-Tilt / Screws Tilt Adjust

### Files to delete
| File | Reason |
|---|---|
| `src/composables/useZOffset.ts` | Z-offset logic composable |
| `src/components/panels/ToolheadControls/ZoffsetControl.vue` | Z-offset control panel |
| `src/components/dialogs/TheScrewsTiltAdjustDialog.vue` | Screws tilt adjust dialog |
| `src/components/dialogs/TheScrewsTiltAdjustDialogEntry.vue` | Screws tilt adjust entry |

### Files to edit
| File | Change |
|---|---|
| `src/App.vue` | Remove `<the-screws-tilt-adjust-dialog />` |
| `src/composables/useControl.ts` | Remove `existsZtilt`, `existsScrewsTilt`, `doZtilt` |
| `src/components/panels/ToolheadControls/CircleControl.vue` | Remove Z-tilt action button branch |
| `src/components/panels/ToolheadControls/CrossControl.vue` | Remove Z-tilt action button branch |
| `src/components/panels/ToolheadControlPanel.vue` | Remove Z-tilt list-item, `showZOffset`, `existsZtilt`, `existsScrewsTilt` |
| `src/components/panels/ToolheadControls/ToolheadPanelSettings.vue` | Remove `showZOffset` toggle |
| `src/store/printer/actions.ts` | Remove `clearScrewsTiltAdjust` |
| `src/store/printer/mutations.ts` | Remove `clearScrewsTiltAdjust` |
| `src/store/printer/getters.ts` | Remove `existsZtilt`, `existsScrewsTilt` |
| `src/store/gui/getters.ts` | Remove default action `'ztilt'` |
| `src/store/gui/types.ts` | Remove `actionButton`, `offsetZSaveOption`, `boolScrewsTiltAdjustDialog`, `showZOffset` |
| `src/store/gui/index.ts` | Remove default values for above |
| `src/composables/useDashboard.ts` | Remove `'zoffset'` panel case |
| `src/components/settings/SettingsControlTab.vue` | Remove Z-offset save options, Z-tilt defaults, increments |
| `src/components/settings/SettingsUiSettingsTab.vue` | Remove `boolScrewsTiltAdjustDialog` toggle |

---

## Phase 5: Filament Sensors, Charts, Maintenance

### Files to delete
| File | Reason |
|---|---|
| `src/components/inputs/FilamentSensor.vue` | Filament runout sensor UI |
| `src/components/charts/HistoryFilamentUsage.vue` | Filament usage history chart |

### Files to edit
| File | Change |
|---|---|
| `src/components/panels/MiscellaneousPanel.vue` | Remove `FilamentSensor` import and usage |
| `src/store/printer/getters.ts` | Remove `getFilamentSensors` |
| `src/store/printer/types.ts` | Remove `PrinterStateFilamentSensors` |
| `src/store/variables.ts` | Remove filament metadata fields from `allowedMetadata` |
| `src/store/files/types.ts` | Remove filament metadata fields |
| `src/store/gui/maintenance/` | Remove filament reminder types, getters, actions |
| `src/composables/useHistoryStats.ts` | Remove filament aggregation |
| `src/plugins/helpers.ts` | Remove `filamentWeightFormat`, `filamentTextColor` |
| `src/store/gui/index.ts` | Remove filament from calc options defaults |
| `src/store/gui/types.ts` | Remove filament from calc options types |

---

## Phase 6: MMU / AFC / Multi-Material

### Files to delete
| File | Reason |
|---|---|
| `src/plugins/mmuIcons.ts` | MMU vendor icon definitions |
| `src/plugins/afcIcons.ts` | AFC icon definitions |

### Files to edit
| File | Change |
|---|---|
| `src/store/variables.ts` | Remove `mmu_print` from `allowedMetadata`, `'mmu'` from `genericLogfiles`, `'afc'` from `allDashboardPanels` |
| `src/store/gui/types.ts` | Remove `view.afc` and `view.mmu` state types |
| `src/store/gui/index.ts` | Remove `view.afc` and `view.mmu` defaults |
| `src/store/files/types.ts` | Remove `mmu_print` field |

---

## Phase 7: Spoolman

### Files to delete
| File | Reason |
|---|---|
| `src/components/ui/SpoolIcon.vue` | Filament spool icon |

### Files to edit
| File | Change |
|---|---|
| `src/store/variables.ts` | Remove `'spoolman'` from `initableServerComponents` |
| `src/composables/useBase.ts` | Remove `spoolman` server config reference |

---

## Phase 8: Extruder-Specific Logic

### Files to delete
| File | Reason |
|---|---|
| `src/composables/useExtruder.ts` | Extruder list/state composable |

### Files to edit
| File | Change |
|---|---|
| `src/store/printer/getters.ts` | Remove `getExtruders`, `getExtruderStepper`, `canExtrude` |
| `src/store/variables.ts` | Remove `extruder_colors` from `allowedMetadata` |
| `src/store/files/types.ts` | Remove `extruder_colors` field |
| `src/store/gui/types.ts` | Remove `extruderColors` from gcodeViewer |
| `src/store/gui/index.ts` | Remove default `extruderColors` |
| `src/components/gcodeviewer/Viewer.vue` | Remove extruder colors loading, nozzle diameter |
| `src/store/farm/printer/getters.ts` | Remove extruder key filtering |

---

## Phase 9: Temperature Presets

### Files to delete
| File | Reason |
|---|---|
| `src/store/gui/presets/` (entire directory) | Presets store module |
| `src/components/settings/Presets/` (entire directory) | Presets settings UI |
| `src/components/panels/Temperature/TemperaturePanelPresets.vue` | In-dashboard preset selector + cooldown |

### Files to edit
| File | Change |
|---|---|
| `src/store/gui/index.ts` | Remove `import { presets }` and presets from modules |
| `src/components/TheSettingsMenu.vue` | Remove `SettingsPresetsTab` import and tab |

---

## Phase 10: Exclude Object (G-code Viewer)

### Files to edit — no deletions
| File | Change |
|---|---|
| `src/components/gcodeviewer/Viewer.vue` | Remove exclude-object dialog template, computed refs, and printer state subscription |

---

## Verification

1. `bun run build` — must pass with zero errors
2. Check routes load without errors in browser: `/`, `/console`, `/files`, `/viewer`, `/history`, `/config`
3. Verify no console errors on any route
4. Run `bun run vitest run` — all existing tests must pass (update tests for removed helpers)
