import AccordianItem from './accordian-item'
import * as Yup from 'yup'
import { Input } from './form'
import { InputGroup } from 'react-bootstrap'
import { BOOST_MIN } from '../lib/constants'
import { NAME_QUERY } from '../fragments/users'

export function AdvPostSchema (client) {
  return {
    boost: Yup.number().typeError('must be a number')
      .min(BOOST_MIN, `must be at least ${BOOST_MIN}`).integer('must be whole'),
    forward: Yup.string()
      .test({
        name: 'name',
        test: async name => {
          if (!name || !name.length) return true
          const { data } = await client.query({ query: NAME_QUERY, variables: { name }, fetchPolicy: 'network-only' })
          return !data.nameAvailable
        },
        message: 'user does not exist'
      })
  }
}

export const AdvPostInitial = {
  boost: '',
  forward: ''
}

export default function AdvPostForm () {
  return (
    <AccordianItem
      header={<div style={{ fontWeight: 'bold', fontSize: '92%' }}>options</div>}
      body={
        <>
          <Input
            label='boost'
            name='boost'
            hint={<span className='text-muted'>ranks posts higher temporarily based on the amount</span>}
            append={<InputGroup.Text className='text-monospace'>sats</InputGroup.Text>}
          />
          <Input
            label='forward sats to'
            name='forward'
            hint={<span className='text-muted'>100% of sats will be sent to this user</span>}
            prepend=<InputGroup.Text>@</InputGroup.Text>
            showValid
          />
        </>
      }
    />
  )
}
