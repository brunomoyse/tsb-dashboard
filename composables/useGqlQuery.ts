// Composables/useGqlQuery.ts
import { type DocumentNode, print } from 'graphql'
import { type Ref, watch } from 'vue'
import { useAsyncData, useNuxtApp } from '#imports'
import { hash } from 'ohash'

type Vars = Record<string, unknown> | (() => Record<string, unknown>)
interface Options {
    immediate?: boolean
    cache?: boolean
}

interface GqlQueryResult<T> {
    data: Ref<T | undefined>
    pending: Ref<boolean>
    error: Ref<unknown>
    refresh: (opts?: { dedupe?: 'cancel' | 'defer' }) => Promise<void>
    refetch: (opts?: { dedupe?: 'cancel' | 'defer' }) => Promise<void>
}

export const useGqlQuery = async <T>(
    rawQuery: string | DocumentNode,
    variables: Vars = {},
    opts: Options = { immediate: true, cache: false },   // ⬅ default cache:false
): Promise<GqlQueryResult<T>> => {
    const { $gqlFetch } = useNuxtApp()
    const getVars = () => (typeof variables === 'function' ? variables() : variables)
    const handler = () => $gqlFetch<T>(printIfAst(rawQuery), { variables: getVars() })

    // Choose overload: with key (cache) or without key (no cache)
    const asyncData = opts.cache
        ? await useAsyncData<T>(`gql:${hash(printIfAst(rawQuery))}`, handler, {
            immediate: opts.immediate,
        })
        : await useAsyncData<T>(handler, { immediate: opts.immediate })

    if (typeof variables === 'function') {
        watch(
            () => variables(),
            () => asyncData.refresh({ dedupe: 'cancel' }),
            { deep: true },
        )
    }

    const result = asyncData as unknown as GqlQueryResult<T>
    result.refetch = asyncData.refresh
    return result
}

const printIfAst = (q: string | DocumentNode): string =>
    typeof q === 'string' ? q : print(q)
