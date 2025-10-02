import { useEffect, useCallback, useRef } from 'react';
import { StatusOutgoingMessage } from '../../../server/src/models/messages';

/**
 * ToastMessage component for showing temporary success or error messages,
 * styled using Tailwind CSS.
 *
 * @param {object} props
 * @param {Array<object>} props.messages - Array of message objects: [{ id: string, type: 'success'|'error', text: string }]
 * @param {function} props.onRemove - Callback function to remove a message by its ID.
 */
const ToastMessage = ({ messages, onRemove }: { messages: StatusOutgoingMessage[], onRemove: (id: string) => void }) => {
    // Duration in milliseconds before a toast is automatically removed
    const AUTO_DELETE_TIME = 20000; // 20 seconds

    // useRef to hold the mapping of message ID to its timer ID.
    // Using useRef prevents unnecessary re-renders when updating timer IDs.
    const timerRefs = useRef({} as { [key: string]: ReturnType<typeof setTimeout> });

    // Stable function reference for removing a toast and clearing its timer
    const removeToast = useCallback((id: string) => {
        // 1. Clear the specific timer associated with this message ID
        if (timerRefs.current[id]) {
            clearTimeout(timerRefs.current[id]);
            // Remove the reference from the map
            delete timerRefs.current[id];
        }

        // 2. Call the parent's removal function
        if (onRemove) {
            onRemove(id);
        }
    }, [onRemove]);

    // Effect to set up auto-removal timers for *new* messages
    useEffect(() => {
        // Get the IDs of messages we've already set timers for
        const existingTimerIds = Object.keys(timerRefs.current);

        // Loop through current messages and set timers only for new ones
        messages.forEach(message => {
            if (!existingTimerIds.includes(message.id)) {
                // Create the new timer
                const timerId = setTimeout(() => {
                    removeToast(message.id);
                }, AUTO_DELETE_TIME);

                // Store the timer ID reference
                timerRefs.current[message.id] = timerId;
            }
        });

        // Cleanup function: Clear all timers when the component unmounts
        // Get the IDs of messages currently being rendered (the new 'messages' list)
        const currentMessageIds = messages.map(m => m.id);

        // Loop through all stored timers
        Object.keys(timerRefs.current).forEach(id => {
            // If this timer's ID is not in the current messages, clear it
            if (!currentMessageIds.includes(id)) {
                clearTimeout(timerRefs.current[id]);
                delete timerRefs.current[id];
            }
        });
    }, [messages, removeToast]); // Rerun when the message list changes


    // Conditional function to get Tailwind classes based on message type
    const getToastClasses = (message: StatusOutgoingMessage) => {
        let base = 'py-2 px-4 rounded-lg shadow-xl mt-3 flex items-center justify-between min-w-[280px] transition-all duration-300 ease-out transform translate-x-0 opacity-100';
        if (message.type === 'SUCCESS') {
            // Light green background, green border, dark green text
            return `${base} bg-emerald-100 border border-green-400 text-green-800`;
        } else if (message.type === 'ERROR') {
            console.log("Error toast detected");
            // Light red background, red border, dark red text
            return `${base} bg-red-100 border border-red-400 text-red-800`;
        }
        return base;
    };

    // If there are no messages, don't render the container
    if (messages.length === 0) {
        return null;
    }

    return (
        // Fixed container for all toasts, positioned at bottom-right
        <div className="absolute w-100 bottom-4 right-4 z-50 flex flex-col-reverse space-y-3 space-y-reverse">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={getToastClasses(message)}
                >
                    <div className="flex items-center">
                        <p className="font-medium text-sm">{message.content}</p>
                    </div>
                    {/* Close button */}
                    <button
                        onClick={() => removeToast(message.id)}
                        className="ml-4 p-1 text-4xl leading-none hover:opacity-75 focus:outline-none"
                        aria-label="Close message"
                    >
                        &times;
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ToastMessage;