<template>
    <article class="rounded-2xl border border-(--app-border) bg-(--app-elevated) p-5 shadow-(--app-shadow-sm) md:p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
                <p class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">
                    {{ t('ignorePatterns.section') }}
                </p>
                <h3 class="mt-1 text-base font-semibold text-(--app-text)">{{ t('ignorePatterns.title') }}</h3>
            </div>
        </div>

        <p class="mt-3 max-w-2xl text-sm text-(--app-muted)">
            {{ t('ignorePatterns.description') }}
        </p>

        <div class="mt-4 space-y-3">
            <textarea
                v-model="patternsText"
                :disabled="!projectId || isSaving"
                :placeholder="t('ignorePatterns.placeholder')"
                rows="6"
                class="w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm font-mono outline-none ring-(--app-accent) transition focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />

            <div class="flex items-center gap-3">
                <button
                    type="button"
                    :disabled="!projectId || isSaving"
                    class="rounded-lg bg-(--app-accent) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    @click="handleSave"
                >
                    {{ isSaving ? t('ignorePatterns.saving') : t('ignorePatterns.save') }}
                </button>

                <span
                    v-if="feedback"
                    class="text-sm"
                    :class="feedbackIsError ? 'text-(--status-deleted-text)' : 'text-(--status-added-text)'"
                >
                    {{ feedback }}
                </span>
            </div>
        </div>
    </article>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { listIgnorePatterns, saveIgnorePatterns } from '../services/api';

const props = defineProps<{
    projectId: number | null;
}>();

const { t } = useI18n({ useScope: 'global' });

const patternsText = ref('');
const isSaving = ref(false);
const feedback = ref('');
const feedbackIsError = ref(false);

let feedbackTimer: ReturnType<typeof setTimeout> | null = null;

function showFeedback(message: string, isError: boolean): void {
    if (feedbackTimer) {
        clearTimeout(feedbackTimer);
    }

    feedback.value = message;
    feedbackIsError.value = isError;

    feedbackTimer = setTimeout(() => {
        feedback.value = '';
    }, 3000);
}

async function loadPatterns(): Promise<void> {
    if (props.projectId === null) {
        patternsText.value = '';
        return;
    }

    try {
        const patterns = await listIgnorePatterns(props.projectId);
        patternsText.value = patterns.join('\n');
    } catch (_) {
        patternsText.value = '';
    }
}

async function handleSave(): Promise<void> {
    if (props.projectId === null) {
        return;
    }

    isSaving.value = true;
    feedback.value = '';

    try {
        const patterns = patternsText.value
            .split('\n')
            .map((p) => p.trim())
            .filter((p) => p.length > 0 && p.charAt(0) !== '#');

        await saveIgnorePatterns(props.projectId, patterns);
        showFeedback(t('ignorePatterns.saved'), false);
    } catch (_) {
        showFeedback(t('ignorePatterns.error'), true);
    } finally {
        isSaving.value = false;
    }
}

onMounted(() => {
    void loadPatterns();
});

watch(() => props.projectId, () => {
    void loadPatterns();
});
</script>
