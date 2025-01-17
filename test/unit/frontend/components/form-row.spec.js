import { mount } from '@vue/test-utils'
import { expect, vi } from 'vitest'

import FormRow from '../../../../frontend/src/components/FormRow.vue'

describe('FormRow', () => {
    test('mounts with type="checkbox"', async () => {
        expect(FormRow).toBeTruthy()

        const wrapper = mount(FormRow, {
            props: {
                type: 'checkbox'
            },
            shallow: true
        })

        expect(wrapper.find('ff-checkbox').exists()).toBe(true)
        expect(wrapper.find('input[type="file"]').exists()).toBe(false)
        expect(wrapper.find('ff-dropdown').exists()).toBe(false)
        expect(wrapper.find('ff-text-input').exists()).toBe(false)
        expect(wrapper.find('[data-el="form-row-uneditable"]').exists()).toBe(false)
    })

    test('mounts with type="file"', async () => {
        expect(FormRow).toBeTruthy()

        const wrapper = mount(FormRow, {
            props: {
                type: 'file'
            },
            shallow: true
        })

        expect(wrapper.find('ff-checkbox').exists()).toBe(false)
        expect(wrapper.find('input[type="file"]').exists()).toBe(true)
        expect(wrapper.find('ff-dropdown').exists()).toBe(false)
        expect(wrapper.find('ff-text-input').exists()).toBe(false)
        expect(wrapper.find('[data-el="form-row-uneditable"]').exists()).toBe(false)
    })

    test('mounts a dropdown if options are provided', async () => {
        expect(FormRow).toBeTruthy()

        const wrapper = mount(FormRow, {
            props: {
                options: [[], []]
            },
            shallow: true
        })

        expect(wrapper.find('ff-checkbox').exists()).toBe(false)
        expect(wrapper.find('input[type="file"]').exists()).toBe(false)
        expect(wrapper.find('ff-listbox').exists()).toBe(true)
        expect(wrapper.find('ff-text-input').exists()).toBe(false)
        expect(wrapper.find('[data-el="form-row-uneditable"]').exists()).toBe(false)
    })

    test('mounts a an uneditable field with type="uneditable"', async () => {
        expect(FormRow).toBeTruthy()

        const wrapper = mount(FormRow, {
            props: {
                type: 'uneditable'
            },
            shallow: true
        })

        expect(wrapper.find('ff-checkbox').exists()).toBe(false)
        expect(wrapper.find('input[type="file"]').exists()).toBe(false)
        expect(wrapper.find('ff-dropdown').exists()).toBe(false)
        expect(wrapper.find('ff-text-input').exists()).toBe(false)
        expect(wrapper.find('[data-el="form-row-uneditable"]').exists()).toBe(true)
    })

    test('mounts a text input by default', async () => {
        expect(FormRow).toBeTruthy()

        const wrapper = mount(FormRow, {
            props: {},
            shallow: true
        })

        expect(wrapper.find('ff-checkbox').exists()).toBe(false)
        expect(wrapper.find('input[type="file"]').exists()).toBe(false)
        expect(wrapper.find('ff-dropdown').exists()).toBe(false)
        expect(wrapper.find('ff-text-input').exists()).toBe(true)
        expect(wrapper.find('[data-el="form-row-uneditable"]').exists()).toBe(false)
    })

    test('displays an error if provided', async () => {
        expect(FormRow).toBeTruthy()

        const wrapper = mount(FormRow, {
            props: {
                error: 'This is an error'
            },
            shallow: true
        })

        expect(wrapper.find('[data-el="form-row-error"]').exists()).toBe(true)
        expect(wrapper.findAll('[data-el="form-row-error"]').length).toBe(1)
        expect(wrapper.find('[data-el="form-row-error"]').text()).toEqual('This is an error')
    })

    /*
        Slots
    */
    test('displays a Title in the relevant slot', async () => {
        expect(FormRow).toBeTruthy()

        const wrapper = mount(FormRow, {
            slots: {
                default: 'Title'
            },
            shallow: true
        })

        expect(wrapper.find('[data-el="form-row-title"]').exists()).toBe(true)
        expect(wrapper.findAll('[data-el="form-row-title"]').length).toBe(1)
        expect(wrapper.find('[data-el="form-row-title"]').text()).toEqual('Title')
    })

    test('displays a Description in the relevant slot', async () => {
        expect(FormRow).toBeTruthy()

        const wrapper = mount(FormRow, {
            slots: {
                description: 'Description'
            },
            shallow: true
        })

        expect(wrapper.find('[data-el="form-row-description"]').exists()).toBe(true)
        expect(wrapper.findAll('[data-el="form-row-description"]').length).toBe(1)
        expect(wrapper.find('[data-el="form-row-description"]').text()).toEqual('Description')
    })

    test('allows content to be added as an "append" to the form row', async () => {
        expect(FormRow).toBeTruthy()

        const wrapper = mount(FormRow, {
            props: {
                appendClass: 'append-class'
            },
            slots: {
                append: 'Append'
            },
            shallow: true
        })

        expect(wrapper.find('[data-el="form-row-append"]').exists()).toBe(true)
        expect(wrapper.findAll('[data-el="form-row-append"]').length).toBe(1)
        expect(wrapper.find('[data-el="form-row-append"]').text()).toEqual('Append')
        expect(wrapper.find('[data-el="form-row-append"]').classes()).toContain('append-class')
    })

    test('provides a wrapper and formatting around a custom input if provided', async () => {
        expect(FormRow).toBeTruthy()

        const wrapper = mount(FormRow, {
            slots: {
                input: 'CustomInput'
            },
            shallow: true
        })

        expect(wrapper.text()).toContain('CustomInput')
    })

    /*  Methods */

    test('enables the focussing of the loaded input', async () => {
        expect(FormRow).toBeTruthy()

        const focusSpy = vi.fn()

        const wrapper = mount(FormRow, {
            shallow: true,
            global: {
                stubs: {
                    'ff-text-input': {
                        template: '<input id="input-stub" ref="input"/>',
                        methods: {
                            focus: focusSpy
                        }
                    }
                }
            }
        })

        wrapper.vm.focus()
        await wrapper.vm.$nextTick()
        expect(focusSpy).toHaveBeenCalledTimes(1)
    })
})
