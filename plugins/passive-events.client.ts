export default defineNuxtPlugin(() => {
    const originalAddEventListener = EventTarget.prototype.addEventListener

    // eslint-disable-next-line func-names, no-extend-native
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
