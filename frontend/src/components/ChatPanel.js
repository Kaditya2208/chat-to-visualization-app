import QuestionInput from './QuestionInput';

const ChatPanel = ({ messages }) => (
  <> {/* Use a fragment to avoid an extra div */}
    <div className="message-list">
      {messages.map((msg, index) => (
        <div key={index} className={`message ${msg.type}`}>
          {msg.type === 'question' ? `You: ${msg.question}` : msg.text}
        </div>
      ))}
    </div>
    <QuestionInput />
  </>
);
export default ChatPanel;