// ========================================
// Flex Message Templates - Mint Theme
// ========================================

/**
 * Create Health Status Flex Message
 * @param {string} url - URL to open (status page)
 * @returns {Object} - LINE Flex Message
 */
function createHealthFlexMessage(url) {
    return {
        type: 'flex',
        altText: '🏥 System Health Status',
        contents: {
            type: 'bubble',
            size: 'giga',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '🏥 System Health',
                                weight: 'bold',
                                size: 'xl',
                                color: '#FFFFFF'
                            },
                            {
                                type: 'text',
                                text: 'ตรวจสอบสถานะระบบ',
                                size: 'sm',
                                color: '#FFFFFF',
                                margin: 'sm'
                            }
                        ]
                    }
                ],
                paddingAll: '20px',
                backgroundColor: '#4CAF50',
                spacing: 'md'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: 'ดูสถานะการทำงานของระบบ',
                        size: 'md',
                        color: '#2c3e3c',
                        wrap: true,
                        weight: 'regular'
                    },
                    {
                        type: 'separator',
                        margin: 'lg'
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '✓',
                                        size: 'sm',
                                        color: '#4CAF50',
                                        flex: 0,
                                        weight: 'bold'
                                    },
                                    {
                                        type: 'text',
                                        text: 'Database Status',
                                        size: 'sm',
                                        color: '#5a706d',
                                        margin: 'md'
                                    }
                                ]
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '✓',
                                        size: 'sm',
                                        color: '#4CAF50',
                                        flex: 0,
                                        weight: 'bold'
                                    },
                                    {
                                        type: 'text',
                                        text: 'API Services',
                                        size: 'sm',
                                        color: '#5a706d',
                                        margin: 'md'
                                    }
                                ],
                                margin: 'sm'
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '✓',
                                        size: 'sm',
                                        color: '#4CAF50',
                                        flex: 0,
                                        weight: 'bold'
                                    },
                                    {
                                        type: 'text',
                                        text: 'Attendance System',
                                        size: 'sm',
                                        color: '#5a706d',
                                        margin: 'md'
                                    }
                                ],
                                margin: 'sm'
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '✓',
                                        size: 'sm',
                                        color: '#4CAF50',
                                        flex: 0,
                                        weight: 'bold'
                                    },
                                    {
                                        type: 'text',
                                        text: 'Cron Jobs',
                                        size: 'sm',
                                        color: '#5a706d',
                                        margin: 'md'
                                    }
                                ],
                                margin: 'sm'
                            }
                        ],
                        margin: 'lg',
                        spacing: 'sm'
                    }
                ],
                spacing: 'md',
                paddingAll: '20px'
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: '#4CAF50',
                        action: {
                            type: 'uri',
                            label: '🔍 ดูรายละเอียด',
                            uri: url,
                            altUri: {
                                desktop: url
                            }
                        },
                        height: 'sm'
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '🔒 สำหรับพนักงานทุกคนเท่านั้น',
                                size: 'xxs',
                                color: '#8fa8a4',
                                align: 'center'
                            }
                        ],
                        margin: 'md'
                    }
                ],
                spacing: 'sm',
                paddingAll: '20px'
            }
        }
    };
}

/**
 * Create System Logs Flex Message
 * @param {string} url - URL to open (systemlog page)
 * @returns {Object} - LINE Flex Message
 */
function createSystemLogFlexMessage(url) {
    return {
        type: 'flex',
        altText: '📋 System Logs',
        contents: {
            type: 'bubble',
            size: 'giga',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '📋 System Logs',
                                weight: 'bold',
                                size: 'xl',
                                color: '#FFFFFF'
                            },
                            {
                                type: 'text',
                                text: 'Developer Dashboard',
                                size: 'sm',
                                color: '#FFFFFF',
                                margin: 'sm'
                            }
                        ]
                    }
                ],
                paddingAll: '20px',
                backgroundColor: '#539d96',
                spacing: 'md'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: 'ดูบันทึกการทำงานของระบบทั้งหมด',
                        size: 'md',
                        color: '#2c3e3c',
                        wrap: true,
                        weight: 'regular'
                    },
                    {
                        type: 'separator',
                        margin: 'lg'
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '📍',
                                        size: 'sm',
                                        flex: 0
                                    },
                                    {
                                        type: 'text',
                                        text: 'GPS Tracking Logs',
                                        size: 'sm',
                                        color: '#5a706d',
                                        margin: 'md'
                                    }
                                ]
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '⏰',
                                        size: 'sm',
                                        flex: 0
                                    },
                                    {
                                        type: 'text',
                                        text: 'Check-in/out Activities',
                                        size: 'sm',
                                        color: '#5a706d',
                                        margin: 'md'
                                    }
                                ],
                                margin: 'sm'
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🔐',
                                        size: 'sm',
                                        flex: 0
                                    },
                                    {
                                        type: 'text',
                                        text: 'Authentication Logs',
                                        size: 'sm',
                                        color: '#5a706d',
                                        margin: 'md'
                                    }
                                ],
                                margin: 'sm'
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '⚙️',
                                        size: 'sm',
                                        flex: 0
                                    },
                                    {
                                        type: 'text',
                                        text: 'System Events',
                                        size: 'sm',
                                        color: '#5a706d',
                                        margin: 'md'
                                    }
                                ],
                                margin: 'sm'
                            }
                        ],
                        margin: 'lg',
                        spacing: 'sm'
                    }
                ],
                spacing: 'md',
                paddingAll: '20px'
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: '#539d96',
                        action: {
                            type: 'uri',
                            label: '🔍 เปิด Dashboard',
                            uri: url,
                            altUri: {
                                desktop: url
                            }
                        },
                        height: 'sm'
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '🔒 สำหรับ Developer เท่านั้น',
                                size: 'xxs',
                                color: '#8fa8a4',
                                align: 'center'
                            }
                        ],
                        margin: 'md'
                    }
                ],
                spacing: 'sm',
                paddingAll: '20px'
            }
        }
    };
}

module.exports = {
    createHealthFlexMessage,
    createSystemLogFlexMessage
};
