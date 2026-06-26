import { describe, expect, it } from 'vitest'
import { buildJogScript, isEditableTarget } from '@/components/panels/Cnc/jogKeyboard'

describe('JogPanel keyboard helpers', () => {
    it('treats editable elements as caret-safe targets', () => {
        const input = document.createElement('input')
        const textarea = document.createElement('textarea')
        const select = document.createElement('select')
        const contentEditable = document.createElement('div')
        // jsdom doesn't implement isContentEditable, so we mock it
        Object.defineProperty(contentEditable, 'isContentEditable', { value: true })
        const plainDiv = document.createElement('div')

        expect(isEditableTarget(input)).toBe(true)
        expect(isEditableTarget(textarea)).toBe(true)
        expect(isEditableTarget(select)).toBe(true)
        expect(isEditableTarget(contentEditable)).toBe(true)
        expect(isEditableTarget(plainDiv)).toBe(false)
        expect(isEditableTarget(null)).toBe(false)
    })

    it('builds jog gcode with the expected feedrate and state wrapper', () => {
        expect(buildJogScript('X', 10, 100)).toBe(
            'SAVE_GCODE_STATE NAME=_ui_movement\nG91\nG1 X10 F6000\nRESTORE_GCODE_STATE NAME=_ui_movement'
        )
        expect(buildJogScript('Y', -5, 25)).toBe(
            'SAVE_GCODE_STATE NAME=_ui_movement\nG91\nG1 Y-5 F1500\nRESTORE_GCODE_STATE NAME=_ui_movement'
        )
    })
})
