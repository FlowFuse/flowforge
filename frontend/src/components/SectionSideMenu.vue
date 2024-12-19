<template>
    <ul class="mb-6 sm:mb-0 w-full pb-4 sm:pb-0 sm:w-32 border-b sm:border-b-0 sm:border-r overflow-hidden border-gray-400 mr-6 text-gray-500 space-y-2" data-el="section-side-menu">
        <template v-for="item in filteredOptions" :key="item.name">
            <li class="block">
                <router-link :to="item.path" class="block text-sm px-3 py-1 sm:py-2 pl-3 ml-1" exact-active-class="text-blue-700 ml-0 border-l-4 border-blue-700" :data-nav="item.name.toLowerCase()">{{ item.name }}</router-link>
            </li>
        </template>
    </ul>
</template>
<script>

export default {
    name: 'SectionSideMenu',
    props: ['options'],
    computed: {
        filteredOptions () {
            return this.options.filter(option => !option.hidden ?? true)
        }
    }
}

</script>
