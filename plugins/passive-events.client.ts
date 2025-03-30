export default defineNuxtPlugin(() => {
    const originalAddEventListener = EventTarget.prototype.addEventListener

    EventTarget.prototype.addEventListener = function (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ) {
        if (type === 'touchstart') {
            if (options === undefined) {
                options = { passive: true }
            } else if (typeof options === 'boolean') {
                options = { capture: options, passive: true }
            } else if (typeof options === 'object') {
                options = { ...options, passive: true }
            }
        }

        return originalAddEventListener.call(this, type, listener, options)
    }
})
