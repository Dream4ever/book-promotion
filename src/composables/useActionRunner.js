import { getErrorMessage } from '../utils/api'

export function useActionRunner({ busy, refresh, clearAllSelections, setMessage }) {
  async function runAction(
    action,
    {
      successText = '',
      afterSuccess = null,
      onError = null,
      refreshOnSuccess = true,
      clearSelectionsOnSuccess = true,
    } = {},
  ) {
    busy.value = true
    try {
      const result = await action()
      if (refreshOnSuccess) await refresh()
      if (clearSelectionsOnSuccess) clearAllSelections()
      if (afterSuccess) afterSuccess(result)
      if (successText) setMessage(successText)
      return result
    } catch (error) {
      if (onError) {
        onError(error)
      } else {
        setMessage(getErrorMessage(error), 'error')
      }
      return null
    } finally {
      busy.value = false
    }
  }

  return { runAction }
}
