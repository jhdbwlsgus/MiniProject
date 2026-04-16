import NextAuth from 'next-auth'

const handler = NextAuth({
  // Configure your providers here
})

export { handler as GET, handler as POST }