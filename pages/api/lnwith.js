// verify k1 exists
// send back
import models from '../../api/models'
import getSSRApolloClient from '../../api/ssrApollo'
import { CREATE_WITHDRAWL } from '../../fragments/wallet'

export default async ({ query }, res) => {
  if (query.pr) {
    return doWithdrawal(query, res)
  }

  let reason
  try {
    // TODO: make sure lnwith was recently generated ... or better use a stateless
    // bearer token to auth user
    const lnwith = await models.lnWith.findUnique({ where: { k1: query.k1 } })
    if (lnwith) {
      const user = await models.user.findUnique({ where: { id: lnwith.userId } })
      if (user) {
        return res.status(200).json({
          tag: 'withdrawRequest', // type of LNURL
          callback: process.env.LNWITH_URL, // The URL which LN SERVICE would accept a withdrawal Lightning invoice as query parameter
          k1: query.k1, // Random or non-random string to identify the user's LN WALLET when using the callback URL
          defaultDescription: `Withdrawal for @${user.name} on SN`, // A default withdrawal invoice description
          minWithdrawable: 1000, // Min amount (in millisatoshis) the user can withdraw from LN SERVICE, or 0
          maxWithdrawable: user.msats - 10000 // Max amount (in millisatoshis) the user can withdraw from LN SERVICE, or equal to minWithdrawable if the user has no choice over the amounts
        })
      } else {
        reason = 'user not found'
      }
    } else {
      reason = 'withdrawal not found'
    }
  } catch (error) {
    console.log(error)
    reason = 'internal server error'
  }

  return res.status(400).json({ status: 'ERROR', reason })
}

async function doWithdrawal (query, res) {
  if (!query.k1) {
    return res.status(400).json({ status: 'ERROR', reason: 'k1 not provided' })
  }

  const lnwith = await models.lnWith.findUnique({ where: { k1: query.k1 } })
  if (!lnwith) {
    return res.status(400).json({ status: 'ERROR', reason: 'invalid k1' })
  }
  const me = await models.user.findUnique({ where: { id: lnwith.userId } })
  if (!me) {
    return res.status(400).json({ status: 'ERROR', reason: 'user not found' })
  }

  // create withdrawal in gql
  const client = await getSSRApolloClient(null, me)
  const { error, data } = await client.mutate({
    mutation: CREATE_WITHDRAWL,
    variables: { invoice: query.pr, maxFee: 10 }
  })

  if (error || !data?.createWithdrawl) {
    return res.status(400).json({ status: 'ERROR', reason: error?.toString() || 'could not generate withdrawl' })
  }

  // store withdrawal id lnWith so client can show it
  await models.lnWith.update({ where: { k1: query.k1 }, data: { withdrawalId: Number(data.createWithdrawl.id) } })

  return res.status(200).json({ status: 'OK' })
}
