export class EmailService {
  sendEmail(to: string, content: string) {
    console.log(`Email sent to ${to}: ${content}`)
  }
}
