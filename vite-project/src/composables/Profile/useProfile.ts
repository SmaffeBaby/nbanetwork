import { reactive, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { supabase } from '../../lib/supabase'
import { useAuthPanel } from '../Auth/useAuthPanel'

export function useProfile() {
    const toast = useToast()
    const router = useRouter()
    const { user, handleLogout } = useAuthPanel()

    const activeTab = ref<'main' | 'security'>('main')
    const isEditing = ref(false)
    const loadingSave = ref(false)

    const form = reactive({
        firstName: '',
        lastName: ''
    })

    watch(user, (val) => {
        if (val) {
            form.firstName = val.firstName
            form.lastName = val.lastName
        }
    }, { immediate: true })

    const saveProfile = async () => {
        if (!user.value) return
        loadingSave.value = true

        const { error } = await supabase
            .from('profiles')
            .update({
                first_name: form.firstName,
                last_name: form.lastName
            })
            .eq('id', user.value.id)

        loadingSave.value = false

        if (error) {
            toast.error('Ошибка сохранения')
            return
        }

        user.value.firstName = form.firstName
        user.value.lastName = form.lastName

        toast.success('Профиль обновлён')
        isEditing.value = false
    }

    const logoutAndRedirect = async () => {
        await handleLogout()
    }

    onMounted(async () => {
        if (!user.value) {
            await router.replace('/')
        }
    })

    watch(user, async (newVal) => {
        if (!newVal) {
            await router.replace('/')
        }
    })

    return {
        user,
        activeTab,
        isEditing,
        loadingSave,
        form,
        saveProfile,
        logoutAndRedirect
    }
}