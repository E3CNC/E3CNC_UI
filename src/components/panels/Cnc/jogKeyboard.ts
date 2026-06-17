export function isEditableTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null
    const tagName = element?.tagName?.toUpperCase()

    return !!(element?.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT')
}

export function buildJogScript(axis: string, distance: number, feedrate: number): string {
    return `SAVE_GCODE_STATE NAME=_ui_movement\nG91\nG1 ${axis}${distance} F${feedrate * 60}\nRESTORE_GCODE_STATE NAME=_ui_movement`
}
