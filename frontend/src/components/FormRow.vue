<template>
    <div :class="containerClass ? containerClass : 'max-w-sm'">
        <!-- Checkbox -->
        <template v-if="type==='checkbox'">
            <div class="flex" :class="(wrapperClass ? wrapperClass : 'items-center')">
                <div>
                    <ff-checkbox
                        :id="inputId"
                        ref="input"
                        type="checkbox"
                        :class="inputClass"
                        v-model="localModelValue"
                        :disabled="disabled"
                        data-el="form-row-title"
                    >
                        <slot />
                    </ff-checkbox>
                </div>
                <div v-if="hasAppend" :class="(appendClass ? appendClass : 'inline ml-2')"><slot name="append" /></div>
            </div>
            <div v-if="error" data-el="form-row-error" class="ml-8 text-red-400 inline text-xs">{{ error }}</div>
            <div v-if="hasDescription" data-el="form-row-description" class="ff-description pl-8 mt-1"><slot name="description" /></div>
        </template>
        <!-- Single Line File Selection -->
        <template v-else-if="type==='file'">
            <label data-el="form-row-title" v-if="hasTitle" :for="inputId" class="text-sm font-medium text-gray-800"><slot /></label>
            <div class="flex" :class="(wrapperClass ? wrapperClass : 'items-center')">
                <div class="ff-input ff-text-input">
                    <input
                        :id="inputId"
                        type="file"
                        :class="inputClass"
                        :accept="accept"
                        :name="name"
                        :placeholder="placeholder"
                        :disabled="disabled"
                        :maxlength="maxlength"
                        @change="$emit('update:modelValue', { obj: $event.target, val: $event.target.value})"
                    >
                </div>
            </div>
            <div v-if="error" data-el="form-row-error" class="ml-9 text-red-400 inline text-xs">{{ error }}</div>
            <div v-if="hasDescription" data-el="form-row-description" class="mt-1 ff-description mb-2 ml-9 space-y-1"><slot name="description" /></div>
        </template>
        <template v-else>
            <label data-el="form-row-title" v-if="hasTitle" :for="inputId" :class="(disabled ? 'text-gray-300' : 'text-gray-800')" class="block text-sm font-medium mb-1"><slot /></label>
            <div v-if="hasDescription" data-el="form-row-description" class="ff-description mb-2 space-y-1"><slot name="description" /></div>
            <div :class="(wrapperClass ? wrapperClass : 'flex flex-col sm:flex-row relative items-center')">
                <!-- Dropdown -->
                <template v-if="options && type !== 'uneditable'">
                    <ff-listbox
                        v-model="localModelValue"
                        :options="options"
                        :disabled="disabled"
                        :placeholder="placeholder"
                        data-el="dropdown"
                    />
                </template>
                <!-- Custom Input -->
                <template v-else-if="hasCustomInput">
                    <slot name="input" />
                </template>
                <!-- Static/Uneditable -->
                <template v-else-if="type==='uneditable'">
                    <div data-el="form-row-uneditable" class="w-full uneditable" :class="inputClass + (disabled ? ' text-gray-300' : ' text-gray-800')">{{ modelValue || (valueEmptyText == null ? 'No Value' : valueEmptyText ) }}</div>
                </template>
                <template v-else>
                    <!-- Text Input -->
                    <ff-text-input
                        ref="input"
                        v-model="localModelValue"
                        :placeholder="placeholder"
                        :disabled="disabled"
                        :type="type"
                        :maxlength="maxlength"
                        @enter="$emit('enter')"
                        @blur="$emit('blur')"
                    />
                </template>
                <template v-if="hasAppend">
                    <div data-el="form-row-append" :class="appendClass ? appendClass : 'block sm:inline sm:absolute sm:left-full sm:ml-4 mt-2 sm:mt-0'"><slot name="append" /></div>
                </template>
            </div>
            <div v-if="error" data-el="form-row-error" class="ml-4 text-red-400 text-xs">{{ error }}</div>
            <div v-if="hasAppendedDescription" data-el="form-row-description" class="ff-description mb-2 space-y-1">
                <slot name="appended-description" />
            </div>
        </template>
    </div>
</template>
<script>
import { ref } from 'vue'

let instanceCount = 0
export default {
    name: 'FormRow',
    props: ['id', 'type', 'name', 'value', 'disabled', 'modelValue', 'valueEmptyText', 'error', 'options', 'placeholder', 'containerClass', 'wrapperClass', 'inputClass', 'appendClass', 'accept', 'maxlength'],
    emits: ['update:modelValue', 'blur', 'enter'],
    computed: {
        inputId () {
            return this.id || 'formRow-instance-' + (instanceCount++)
        },
        localModelValue: {
            get () { return this.modelValue },
            set (localModelValue) { this.$emit('update:modelValue', localModelValue) }
        }
    },
    data () {
        return {
            rowValue: null
        }
    },
    setup (props, { slots }) {
        const hasTitle = ref(false)
        const hasAppendedDescription = ref(false)
        const hasDescription = ref(false)
        const hasAppend = ref(false)
        const hasCustomInput = ref(false)
        if (slots.default && slots.default().length) {
            hasTitle.value = true
        }
        if (slots.description && slots.description().length) {
            hasDescription.value = true
        }
        if (slots['appended-description'] && slots['appended-description']().length) {
            hasAppendedDescription.value = true
        }
        if (slots.append && slots.append().length) {
            hasAppend.value = true
        }
        if (slots.input && slots.input().length) {
            hasCustomInput.value = true
        }
        return {
            hasTitle,
            hasDescription,
            hasAppendedDescription,
            hasAppend,
            hasCustomInput
        }
    },
    methods: {
        focus () {
            this.$nextTick(() => {
                this.$refs.input?.focus()
            })
        }
    }
}
</script>
