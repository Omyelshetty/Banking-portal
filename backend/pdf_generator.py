from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from io import BytesIO
from datetime import datetime

def generate_bank_statement(account, transactions):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a4d7a'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    # Title
    story.append(Paragraph("Bank Statement", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Account Information
    account_info = [
        ['Account Number:', account['account_number']],
        ['Account Type:', account['account_type'].capitalize()],
        ['Current Balance:', f"${account['balance']:.2f}"],
        ['Status:', account['status'].capitalize()],
        ['Statement Date:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
    ]
    
    account_table = Table(account_info, colWidths=[2*inch, 4*inch])
    account_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e6f2ff')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey)
    ]))
    
    story.append(account_table)
    story.append(Spacer(1, 0.5*inch))
    
    # Transactions Header
    story.append(Paragraph("Transaction History", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    # Transactions Table
    transaction_data = [['Date', 'Type', 'From Account', 'To Account', 'Amount', 'Description']]
    
    for txn in transactions:
        try:
            timestamp = txn['timestamp']
            if isinstance(timestamp, str):
                # Try parsing ISO format
                if 'Z' in timestamp:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                elif '+' in timestamp or timestamp.count('-') > 2:
                    dt = datetime.fromisoformat(timestamp.replace('+00:00', ''))
                else:
                    dt = datetime.fromisoformat(timestamp)
                date_str = dt.strftime('%Y-%m-%d %H:%M')
            elif isinstance(timestamp, datetime):
                date_str = timestamp.strftime('%Y-%m-%d %H:%M')
            else:
                date_str = str(timestamp)
        except Exception as e:
            date_str = str(txn.get('timestamp', 'N/A'))
        
        txn_type_str = txn['transaction_type']
        if isinstance(txn_type_str, str):
            txn_type = txn_type_str.capitalize()
        else:
            txn_type = txn_type_str.value.capitalize()
        
        from_acc = str(txn.get('from_account_number') or 'N/A')
        to_acc = str(txn.get('to_account_number') or 'N/A')
        amount = f"${float(txn['amount']):.2f}"
        description = str(txn.get('description') or '')
        
        transaction_data.append([date_str, txn_type, from_acc, to_acc, amount, description])
    
    if len(transaction_data) == 1:
        transaction_data.append(['No transactions found', '', '', '', '', ''])
    
    txn_table = Table(transaction_data, colWidths=[1*inch, 0.8*inch, 1.2*inch, 1.2*inch, 1*inch, 1.8*inch])
    txn_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a4d7a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ]))
    
    story.append(txn_table)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer
