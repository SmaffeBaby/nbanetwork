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
    const loadingAvatar = ref(false)

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

    const fileToDataUrl = (file: File) => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
        })
    }

    const uploadAvatar = async (event: Event) => {
        if (!user.value) return

        const input = event.target as HTMLInputElement
        const file = input.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Выберите изображение')
            input.value = ''
            return
        }

        if (file.size > 1024 * 1024) {
            toast.error('Файл должен быть меньше 1 МБ')
            input.value = ''
            return
        }

        loadingAvatar.value = true

        try {
            const avatarImg = await fileToDataUrl(file)

            const { error } = await supabase
                .from('profiles')
                .update({ avatar_img: avatarImg })
                .eq('id', user.value.id)

            if (error) {
                toast.error('Ошибка загрузки аватарки')
                return
            }

            user.value.avatarImg = avatarImg
            toast.success('Аватарка обновлена')
        } catch {
            toast.error('Не удалось прочитать файл')
        } finally {
            loadingAvatar.value = false
            input.value = ''
        }
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
        loadingAvatar,
        form,
        saveProfile,
        uploadAvatar,
        logoutAndRedirect
    }
}